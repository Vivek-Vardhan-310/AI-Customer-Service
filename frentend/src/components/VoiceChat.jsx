import { useEffect, useRef, useState, useCallback } from 'react';
import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/';
ort.env.wasm.numThreads = 1;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  VoiceChat — Full-duplex, real-time voice conversation with barge-in
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Architecture:
 *    1. Client-side VAD (@ricky0123/vad-web) detects speech start/end
 *    2. On speech_end: sends audio blob to backend via WebSocket
 *    3. Backend runs STT → streaming LLM → sentence-buffered TTS text
 *    4. Client speaks TTS text using browser SpeechSynthesis
 *    5. Barge-in: if user speaks while AI is talking, AI stops immediately
 *
 *  No record/stop buttons — fully hands-free.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Derive WebSocket URL from the API URL (http→ws, https→wss)
const getWsUrl = () => {
  const url = new URL(API_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/voice';
  return url.toString();
};

// Conversation states for UI visualization
const STATE = {
  CONNECTING: 'connecting',
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  AI_SPEAKING: 'ai_speaking',
  ERROR: 'error',
};

const STATE_LABELS = {
  [STATE.CONNECTING]: 'Connecting…',
  [STATE.IDLE]: 'Listening for your voice…',
  [STATE.LISTENING]: 'Listening…',
  [STATE.PROCESSING]: 'Thinking…',
  [STATE.AI_SPEAKING]: 'Speaking…',
  [STATE.ERROR]: 'Connection error',
};

const VoiceChat = ({ token, onSessionComplete }) => {
  // ── State ────────────────────────────────────────────────────────────
  const [conversationState, setConversationState] = useState(STATE.CONNECTING);
  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant', text: string}
  const [currentAIText, setCurrentAIText] = useState(''); // live-streamed LLM tokens
  const [error, setError] = useState(null);

  // ── Refs ──────────────────────────────────────────────────────────────
  const wsRef = useRef(null);
  const vadRef = useRef(null);
  const isAISpeakingRef = useRef(false);
  const ttsQueueRef = useRef([]); // queued sentences for TTS
  const isSpeakingTTSRef = useRef(false); // currently playing TTS
  const speechDebounceRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mountedRef = useRef(true);

  // Refs for tracking AI text safely in React StrictMode and volume calibration
  const currentAITextRef = useRef('');
  const peakEchoVolumeRef = useRef(0);
  const ignoreSpeechEndRef = useRef(false);
  const getMicVolumeRef = useRef(null);

  // ── Scroll to bottom when messages change ────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAIText]);

  // ── TTS Engine — sentence queue with barge-in flush ──────────────────
  const speakNextSentence = useCallback(() => {
    if (!mountedRef.current) return;
    if (isSpeakingTTSRef.current) return;
    if (ttsQueueRef.current.length === 0) {
      // Queue empty — TTS is done
      if (isAISpeakingRef.current) {
        isAISpeakingRef.current = false;
        setConversationState(STATE.IDLE);
      }
      return;
    }

    const sentence = ttsQueueRef.current.shift();
    if (!sentence || !window.speechSynthesis) return;

    isSpeakingTTSRef.current = true;
    isAISpeakingRef.current = true;
    setConversationState(STATE.AI_SPEAKING);

    // Calibrate speaker echo volume dynamically during the first 400ms of speech
    peakEchoVolumeRef.current = 0;
    const calibrationInterval = setInterval(() => {
      if (!isAISpeakingRef.current) {
        clearInterval(calibrationInterval);
        return;
      }
      if (getMicVolumeRef.current) {
        const vol = getMicVolumeRef.current();
        if (vol > peakEchoVolumeRef.current) {
          peakEchoVolumeRef.current = vol;
        }
      }
    }, 50);
    setTimeout(() => clearInterval(calibrationInterval), 400);

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = 1.05;
    utterance.pitch = 1;

    utterance.onend = () => {
      isSpeakingTTSRef.current = false;
      speakNextSentence(); // play next sentence in queue
    };

    utterance.onerror = () => {
      isSpeakingTTSRef.current = false;
      speakNextSentence();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const queueTTSSentence = useCallback((text) => {
    ttsQueueRef.current.push(text);
    // If not currently speaking, start playing
    if (!isSpeakingTTSRef.current) {
      speakNextSentence();
    }
  }, [speakNextSentence]);

  /** Flush all TTS — used during barge-in */
  const flushTTS = useCallback(() => {
    window.speechSynthesis?.cancel();
    ttsQueueRef.current = [];
    isSpeakingTTSRef.current = false;
    isAISpeakingRef.current = false;
  }, []);

  // ── Barge-in handler ─────────────────────────────────────────────────
  const handleBargeIn = useCallback(() => {
    if (!isAISpeakingRef.current) return;

    console.log('[VoiceChat] BARGE-IN — stopping AI speech');

    // 1. Stop all TTS playback immediately
    flushTTS();

    // 2. Send abort message to backend to cancel LLM/TTS pipeline
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'abort' }));
    }

    // 3. Clear streamed text
    currentAITextRef.current = '';
    setCurrentAIText('');
    setConversationState(STATE.LISTENING);
  }, [flushTTS]);

  // ── WebSocket message handler ────────────────────────────────────────
  const handleWSMessage = useCallback((event) => {
    if (!mountedRef.current) return;

    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'transcript':
          // User's speech transcribed — add to messages
          setMessages(prev => [...prev, { role: 'user', text: data.text }]);
          setConversationState(STATE.PROCESSING);
          currentAITextRef.current = '';
          setCurrentAIText('');
          break;

        case 'llm_token':
          // Live LLM token — append to current AI response display
          currentAITextRef.current += data.token;
          setCurrentAIText(currentAITextRef.current);
          break;

        case 'tts_text':
          // Complete sentence ready for TTS — queue it
          queueTTSSentence(data.text);
          break;

        case 'turn_complete':
          // Full response done — finalize the AI message
          const text = currentAITextRef.current.trim();
          if (text) {
            setMessages(msgs => [...msgs, { role: 'assistant', text }]);
          }
          currentAITextRef.current = '';
          setCurrentAIText('');
          break;

        case 'no_speech':
          // STT returned empty — go back to idle
          setConversationState(STATE.IDLE);
          break;

        case 'error':
          console.error('[VoiceChat] Server error:', data.message);
          setError(data.message);
          setConversationState(STATE.IDLE);
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('[VoiceChat] Failed to parse WS message:', err);
    }
  }, [queueTTSSentence]);

  // ── Initialize WebSocket + VAD ───────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let isCurrent = true;
    let ws = null;
    let vad = null;
    let stream = null;
    let audioCtx = null;

    const init = async () => {
      // ── 1. Request microphone access with echo cancellation constraints ────────
      try {
        console.log('[VoiceChat] Requesting microphone stream...');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (err) {
        console.error('[VoiceChat] Microphone permission denied/failed:', err);
        if (isCurrent) {
          setError('Microphone access failed. Please check permissions and reload.');
          setConversationState(STATE.ERROR);
        }
        return;
      }

      if (!isCurrent) {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        return;
      }

      // Initialize AudioContext Analyser to monitor mic volume dynamically
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        getMicVolumeRef.current = () => {
          if (!analyser) return 0;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          return sum / bufferLength;
        };
      } catch (err) {
        console.error('[VoiceChat] Failed to initialize AudioContext analyser:', err);
        getMicVolumeRef.current = () => 0;
      }

      // ── 2. Connect WebSocket ─────────────────────────────────────
      const wsUrl = getWsUrl();
      console.log('[VoiceChat] Connecting to', wsUrl);

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[VoiceChat] WebSocket connected');
        if (isCurrent) {
          setConversationState(STATE.IDLE);
          setError(null);
        }
      };

      ws.onmessage = handleWSMessage;

      ws.onerror = (e) => {
        console.error('[VoiceChat] WebSocket error:', e);
        if (isCurrent) {
          setError('Connection error. Please try again.');
          setConversationState(STATE.ERROR);
        }
      };

      ws.onclose = () => {
        console.log('[VoiceChat] WebSocket closed');
        if (isCurrent) {
          setConversationState(STATE.ERROR);
        }
      };

      // Wait for WS to open before starting VAD, but check isCurrent
      try {
        await new Promise((resolve, reject) => {
          const onOpen = () => {
            ws.removeEventListener('error', onError);
            resolve();
          };
          const onError = (e) => {
            ws.removeEventListener('open', onOpen);
            reject(e || new Error('WebSocket connection failed'));
          };
          ws.addEventListener('open', onOpen, { once: true });
          ws.addEventListener('error', onError, { once: true });
          setTimeout(() => {
            ws.removeEventListener('open', onOpen);
            ws.removeEventListener('error', onError);
            reject(new Error('WebSocket connection timeout'));
          }, 5000);
        });
      } catch (err) {
        console.error('[VoiceChat] WS open wait failed:', err);
        if (isCurrent) {
          setError('Failed to establish WebSocket connection.');
          setConversationState(STATE.ERROR);
        }
        return;
      }

      if (!isCurrent) {
        ws.close();
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        return;
      }

      // ── 3. Initialize VAD (Voice Activity Detection) ─────────────
      try {
        // Configure ONNX Runtime to load WebAssembly files from the local public directory
        const ort = await import('onnxruntime-web');
        if (!isCurrent) return;
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/';
        ort.env.wasm.numThreads = 1;

        // Polyfill require globally for CommonJS modules bundled by Vite/Rolldown
        if (typeof window !== 'undefined' && !window.require) {
          window.require = (moduleName) => {
            if (moduleName === 'onnxruntime-web' || moduleName.startsWith('onnxruntime-web/')) {
              return ort;
            }
            throw new Error(`Cannot find module '${moduleName}' in require polyfill`);
          };
        }

        // Dynamic import — vad-web loads ONNX models
        const vadModule = await import('@ricky0123/vad-web');
        if (!isCurrent) return;
        const MicVAD = vadModule.MicVAD;

        vad = await MicVAD.new({
          // Point VAD to load assets from absolute root and WASM from CDN
          baseAssetPath: '/',
          onnxWASMBasePath: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/',
          stream: stream, // Pass our custom echo-cancelled stream

          // ── VAD Configuration ──────────────────────────────────
          positiveSpeechThreshold: 0.8,   // Confidence needed to detect speech
          negativeSpeechThreshold: 0.4,   // Confidence below which speech ends
          redemptionFrames: 10,           // ~700ms silence before speech_end
          minSpeechFrames: 5,             // Minimum speech length to avoid false triggers
          preSpeechPadFrames: 3,          // Capture audio slightly before speech_start

          // ── speech_start callback ──────────────────────────────
          onSpeechStart: () => {
            if (!mountedRef.current) return;
            console.log('[VAD] Speech started');

            if (speechDebounceRef.current) {
              clearTimeout(speechDebounceRef.current);
            }

            // If AI is currently speaking, check if the mic volume is high enough to be a real user interruption (barge-in)
            if (isAISpeakingRef.current) {
              const currentVolume = getMicVolumeRef.current ? getMicVolumeRef.current() : 0;
              const threshold = Math.max(30, peakEchoVolumeRef.current + 12);
              console.log(`[VoiceChat] VAD speech start during AI speech. Vol: ${currentVolume.toFixed(1)}, Calibrated Echo Peak: ${peakEchoVolumeRef.current.toFixed(1)}, Threshold: ${threshold}`);

              if (currentVolume > threshold) {
                console.log('[VoiceChat] Interruption detected! Triggering barge-in.');
                ignoreSpeechEndRef.current = false;
                speechDebounceRef.current = setTimeout(() => {
                  handleBargeIn();
                  speechDebounceRef.current = null;
                }, 100);
              } else {
                console.log('[VoiceChat] Assuming AI echo. Ignoring speech start.');
                ignoreSpeechEndRef.current = true;
              }
            } else {
              ignoreSpeechEndRef.current = false;
              setConversationState(STATE.LISTENING);
            }
          },

          // ── speech_end callback ────────────────────────────────
          onSpeechEnd: (audio) => {
            if (!mountedRef.current) return;

            if (speechDebounceRef.current) {
              clearTimeout(speechDebounceRef.current);
              speechDebounceRef.current = null;
            }

            if (ignoreSpeechEndRef.current) {
              console.log('[VAD] Speech ended. Discarding captured echo audio.');
              ignoreSpeechEndRef.current = false;
              if (isAISpeakingRef.current) {
                setConversationState(STATE.AI_SPEAKING);
              } else {
                setConversationState(STATE.IDLE);
              }
              return;
            }

            console.log('[VAD] Speech ended, audio samples:', audio.length);

            // Convert Float32Array PCM to WAV blob for STT
            const wavBlob = float32ToWav(audio, 16000);

            // Send audio over WebSocket as binary
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              setConversationState(STATE.PROCESSING);
              wsRef.current.send(wavBlob);
              console.log('[VoiceChat] Sent audio blob:', wavBlob.size, 'bytes');
            }
          },
        });

        if (!isCurrent) {
          vad.destroy();
          return;
        }

        vadRef.current = vad;
        vad.start();
        console.log('[VoiceChat] VAD started — listening for speech');

      } catch (err) {
        console.error('[VoiceChat] VAD initialization failed:', err);
        if (isCurrent) {
          setError('Microphone VAD setup failed. Please reload.');
          setConversationState(STATE.ERROR);
        }
      }
    };

    init().catch((err) => {
      console.error('[VoiceChat] Init failed:', err);
      if (isCurrent) {
        setError('Failed to connect. Please try again.');
        setConversationState(STATE.ERROR);
      }
    });

    // ── Cleanup ──────────────────────────────────────────────────────
    return () => {
      mountedRef.current = false;
      isCurrent = false;
      flushTTS();

      if (vadRef.current) {
        vadRef.current.pause();
        vadRef.current.destroy();
        vadRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (speechDebounceRef.current) {
        clearTimeout(speechDebounceRef.current);
      }

      // Stop microphone stream tracks to release device hardware
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      if (audioCtx) {
        try { audioCtx.close(); } catch (e) { }
      }

      // Clean up local instantiations if they haven't been assigned to refs yet
      if (vad) {
        try { vad.destroy(); } catch (e) { }
      }
      if (ws) {
        try { ws.close(); } catch (e) { }
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ───────────────────────────────────────────────────────────
  const stateClass = `voice-state-${conversationState}`;

  return (
    <div className="voice-chat-container">
      {/* ── Animated state indicator ring ──────────────────────────── */}
      <div className={`voice-orb ${stateClass}`}>
        <div className="voice-orb-inner">
          <div className="voice-orb-ring" />
          <div className="voice-orb-ring r2" />
          <div className="voice-orb-ring r3" />
        </div>
        {/* Waveform bars — visible when listening or AI speaking */}
        {(conversationState === STATE.LISTENING || conversationState === STATE.AI_SPEAKING) && (
          <div className="voice-waveform">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="voice-waveform-bar" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Status text ───────────────────────────────────────────── */}
      <div className={`voice-live-status ${stateClass}`}>
        {STATE_LABELS[conversationState] || 'Ready'}
      </div>

      {/* ── Error display ─────────────────────────────────────────── */}
      {error && <div className="voice-error-msg">{error}</div>}

      {/* ── Conversation transcript ───────────────────────────────── */}
      {(messages.length > 0 || currentAIText) && (
        <div className="voice-transcript">
          {messages.map((msg, i) => (
            <div key={i} className={`voice-msg voice-msg-${msg.role}`}>
              <span className="voice-msg-label">{msg.role === 'user' ? 'You' : 'AI'}</span>
              <span className="voice-msg-text">{msg.text}</span>
            </div>
          ))}
          {currentAIText && (
            <div className="voice-msg voice-msg-assistant streaming">
              <span className="voice-msg-label">AI</span>
              <span className="voice-msg-text">{currentAIText}<span className="voice-cursor" /></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Session end button ────────────────────────────────────── */}
      {messages.length > 0 && (
        <button
          type="button"
          className="voice-end-btn compact"
          onClick={onSessionComplete}
        >
          Finish session
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  Utility: Convert Float32Array PCM samples to WAV Blob
//  VAD outputs raw Float32 PCM at 16kHz — Groq Whisper expects a file format
// ═══════════════════════════════════════════════════════════════════════════
function float32ToWav(float32Array, sampleRate = 16000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataLength = float32Array.length * (bitsPerSample / 8);
  const headerLength = 44;

  const buffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);           // chunk size
  view.setUint16(20, 1, true);            // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Convert Float32 samples to Int16
  let offset = 44;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export default VoiceChat;

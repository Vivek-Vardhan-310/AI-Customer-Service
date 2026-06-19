import { useEffect, useRef, useState } from 'react';
import Icon from './ui/Icon';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getSupportedMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/wav',
  ];

  if (!window.MediaRecorder) return '';
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

const VoiceChat = ({ token, onSessionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Tap the mic and ask your question.');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    window.speechSynthesis?.cancel();
  }, []);

  const speakReply = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const sendAudio = async (mimeType) => {
    setIsSending(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    audioChunksRef.current = [];

    if (!audioBlob.size) {
      setIsSending(false);
      setError('No audio was captured. Please try again.');
      setStatus('No audio captured.');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result.split(',')[1];

      try {
        const response = await fetch(`${API_URL}/api/voice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ audio_base64: base64Audio, mime_type: mimeType }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Failed to get voice response');
        }

        const data = await response.json();
        setTranscript(data.transcript || '');
        setReply(data.reply_text || '');
        setStatus('Response received.');

        if (data.audio_base64) {
          const audio = new Audio(`data:${data.audio_mime_type || 'audio/wav'};base64,${data.audio_base64}`);
          audio.play().catch(() => speakReply(data.reply_text));
        } else {
          speakReply(data.reply_text);
        }
      } catch (err) {
        console.error('Error sending audio:', err);
        setError(err.message);
        setStatus('Voice request failed.');
      } finally {
        setIsSending(false);
      }
    };
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('Voice recording is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => sendAudio(mimeType || recorder.mimeType || 'audio/webm');
      recorder.start();

      setIsRecording(true);
      setError(null);
      setReply('');
      setTranscript('');
      setStatus('Recording... tap stop when you are done.');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError(err.message || 'Could not access microphone. Please check permissions.');
      setStatus('Microphone access failed.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('Sending audio to support AI...');
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  return (
    <div className="voice-chat-container">
      <div className="voice-chat-controls">
        {!isRecording ? (
          <button onClick={startRecording} disabled={isSending} className="control-btn record-btn" aria-label="Start recording">
            <Icon name="mic" size={28} />
          </button>
        ) : (
          <button onClick={stopRecording} disabled={isSending} className="control-btn stop-btn" aria-label="Stop recording">
            <Icon name="stop-circle" size={28} />
          </button>
        )}
      </div>
      <div className="status-indicator">{status}</div>
      {isSending && <div className="status-indicator">Sending...</div>}
      {error && <div className="error-message">{error}</div>}
      {transcript && <div className="voice-chat-message"><strong>You:</strong> {transcript}</div>}
      {reply && <div className="voice-chat-message"><strong>AI:</strong> {reply}</div>}
      {reply && <button type="button" className="voice-end-btn compact" onClick={onSessionComplete}>Finish session</button>}
    </div>
  );
};

export default VoiceChat;

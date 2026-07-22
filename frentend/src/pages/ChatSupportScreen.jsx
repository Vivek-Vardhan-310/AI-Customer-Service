import { useState, useEffect, useRef } from 'react';
import Icon from '../components/ui/Icon';
import { apiUrl } from '../config';
import { fetchProfile, fetchProducts, fetchTickets } from '../lib/supabase';

export default function ChatSupportScreen({ onClose, onEndSession }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi I'm your LaptopCare AI Assistant.\nHow can I help you today?", time: '9:41 AM' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const chatEndRef = useRef(null);
  const quickReplies = ['Check Warranty Status', 'Track My Ticket', 'Network / Wi-Fi Issues', 'Laptop Performance Issues', 'Drivers & Downloads'];

  // Fetch user context on mount
  useEffect(() => {
    const loadContext = async () => {
      try {
        const [profile, products, tickets] = await Promise.all([fetchProfile(), fetchProducts(), fetchTickets()]);
        const ctx = {
          name: profile?.full_name || null,
          email: profile?.email || null,
          phone: profile?.phone || null,
          products: (products || []).map(p => ({
            name: p.name,
            model: p.model,
            serial: p.serial,
            warranty: p.warranty,
            warrantyDays: p.warrantyDays,
            amc: p.amc,
            amcDays: p.amcDays,
          })),
          tickets: (tickets || []).map(t => ({
            id: t.id,
            product: t.product,
            category: t.category,
            status: t.status,
            priority: t.priority || 'Medium',
            description: t.description || t.title,
            date: t.created || t.created_at
          })),
        };
        setUserContext(ctx);
      } catch (e) {
        console.error('Failed to load user context for chat:', e);
      }
    };
    loadContext();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    setMessages(prev => [...prev, { role: 'user', content: text, time }]);
    setInput('');
    setLoading(true);
    try {
      const token = localStorage.getItem('supabase_token');

      // Build conversation history from existing messages (excluding the initial greeting)
      const history = messages
        .filter((_, i) => i > 0) // skip initial greeting
        .map(msg => ({ role: msg.role, content: msg.content }));

      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({
          message: text,
          history: history,
          user_context: userContext,
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || JSON.stringify(data), time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry to hear that. Let's troubleshoot this step by step.\n\nFirst, can you confirm your laptop model?", time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-screen">
      <div className="chat-topbar">
        <div className="chat-topbar-left">
          <button className="btn-icon" onClick={onClose}><Icon name="arrow-left" size={20} /></button>
          <div className="chat-bot-avatar"><svg width="24" height="24" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#F9C54D" /><circle cx="18" cy="20" r="3" fill="#131414" /><circle cx="30" cy="20" r="3" fill="#131414" /></svg></div>
          <div className="chat-bot-info">
            <span className="chat-bot-name">Chat with AI</span>
            <span className="chat-bot-status">Online</span>
          </div>
        </div>
        <button className="btn-icon" onClick={() => { onEndSession?.(); onClose(); }}><Icon name="x" size={20} /></button>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'assistant' && <div className="bubble-avatar"><svg width="20" height="20" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#F9C54D" /><circle cx="18" cy="20" r="2" fill="#131414" /><circle cx="30" cy="20" r="2" fill="#131414" /></svg></div>}
            <div className={`bubble-content ${msg.role}`}>
              {msg.content.split('\n').map((line, j) => <div key={j}>{line}</div>)}
              <span className="bubble-time">{msg.time}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble assistant">
            <div className="bubble-avatar"><svg width="20" height="20" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#F9C54D" /></svg></div>
            <div className="bubble-content assistant typing"><span className="typing-dot"></span><span className="typing-dot"></span><span className="typing-dot"></span></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-quick-replies">
        {quickReplies.map(qr => (
          <button key={qr} className="quick-chip" onClick={() => sendMessage(qr)}>{qr}</button>
        ))}
      </div>
      <form className="chat-input-bar" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
        <button type="button" className="btn-icon"><Icon name="paperclip" size={18} /></button>
        <input type="text" className="chat-input" placeholder="Type your message..." value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="chat-send-btn" disabled={!input.trim()}><Icon name="send" size={18} /></button>
      </form>
    </div>
  );
}

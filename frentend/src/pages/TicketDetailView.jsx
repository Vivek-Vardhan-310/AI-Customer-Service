import { useState, useEffect, useRef } from 'react';
import Icon from '../components/ui/Icon';

export default function TicketDetailView({ ticket, onBack, onChat, showToast }) {
  const [activeDetailTab, setActiveDetailTab] = useState('details');
  const tabs = ['Details', 'Timeline', 'Updates', 'Attachments'];
  const timelineRef = useRef(null);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll('.timeline-item'));
    const line = el.querySelector('.timeline-line');
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (line) line.classList.add('in');
        items.forEach((it, i) => setTimeout(() => it.classList.add('in'), i * 50));
        obs.disconnect();
      }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ticket]);

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={20} /></button>
        <h1>Ticket Details</h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <span className={`badge ${ticket.status === 'In Progress' ? 'badge-blue' : ticket.status === 'Open' ? 'badge-amber' : ticket.status === 'Resolved' ? 'badge-green' : 'badge-gray'}`} style={{ marginBottom: 8, display: 'inline-block' }}>{ticket.status}</span>
          <h2 className="ticket-detail-title">{ticket.title}</h2>
          <p className="ticket-detail-meta">Created: {ticket.created} · Last Updated: {ticket.updated}</p>
          <p className="ticket-detail-meta">Ticket ID: #{ticket.id}</p>
        </div>
      </div>

      <div className="ticket-detail-tabs">
        {tabs.map(tab => (
          <button key={tab} className={`ticket-detail-tab ${activeDetailTab === tab.toLowerCase() ? 'active' : ''}`} onClick={() => setActiveDetailTab(tab.toLowerCase())}>{tab}</button>
        ))}
      </div>

      <div className="ticket-detail-section">
        {activeDetailTab === 'details' && (
          <>
            <div className="raise-ticket-product" style={{ marginBottom: 24 }}>
              <img src={ticket.productImage || 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=200'} alt={ticket.product} style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
              <div className="raise-ticket-product-info">
                <h3>{ticket.product}</h3>
                <p>Serial No: {ticket.productSerial || 'N/A'}</p>
              </div>
            </div>
            <div className="ticket-detail-row">
              <div className="ticket-detail-field"><div className="field-label">Category</div><div className="field-value">{ticket.category}</div></div>
            </div>
            <div className="ticket-detail-field" style={{ marginBottom: 20 }}>
              <div className="field-label">Description</div>
              <div className="field-value">{ticket.description}</div>
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Tracking Timeline</h4>
            <div className="ticket-timeline" ref={timelineRef}>
              <div className="timeline-line"></div>
              {(ticket.timeline || []).map((item, i) => (
                <div key={i} className={`timeline-item ${item.done ? 'active' : ''} ${item.done && !(ticket.timeline[i + 1]?.done) ? 'current' : ''}`}>
                  <div className="timeline-node">{item.done && <Icon name="check" size={14} color={item.done && !(ticket.timeline[i + 1]?.done) ? '#131414' : 'white'} />}</div>
                  <div className="timeline-content">
                    <div className="timeline-title">{item.step}</div>
                    <div className="timeline-date">{item.date || 'Pending'}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeDetailTab === 'timeline' && (
          <div className="ticket-timeline">
            {(ticket.timeline || []).map((item, i) => (
              <div key={i} className={`timeline-item ${item.done ? 'active' : ''} ${item.done && !(ticket.timeline[i + 1]?.done) ? 'current' : ''}`}>
                <div className="timeline-node">{item.done && <Icon name="check" size={14} color={item.done && !(ticket.timeline[i + 1]?.done) ? '#131414' : 'white'} />}</div>
                <div className="timeline-content">
                  <div className="timeline-title">{item.step}</div>
                  <div className="timeline-date">{item.date || 'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeDetailTab === 'updates' && (
          <div>
            <h4 style={{ marginBottom: 16 }}>Admin Updates</h4>
            {(ticket.updates || []).length > 0 ? ticket.updates.map((u, i) => (
              <div key={i} style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{u.date}</div>
                <p style={{ fontSize: 14, marginBottom: 6 }}>{u.text}</p>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{u.author}</span>
              </div>
            )) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No updates yet.</p>}
          </div>
        )}

        {activeDetailTab === 'attachments' && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <Icon name="paperclip" size={32} color="#8a8a8a" />
            <p style={{ marginTop: 12 }}>No attachments for this ticket.</p>
          </div>
        )}
      </div>

      <div className="ticket-detail-actions">
        <button className="btn-secondary flex-1" onClick={onChat}><Icon name="message-circle" size={16} /><span>Chat</span></button>
        <button className="btn-primary btn-danger flex-1"><Icon name="x" size={16} /><span>Cancel Ticket</span></button>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, Fragment } from 'react';
import Icon from '../components/ui/Icon';

export default function TicketsPage({ tickets, loading, onSelectTicket }) {
  const [filter, setFilter] = useState('All');
  const filters = [
    { label: 'All', count: tickets.length },
    { label: 'In Progress', count: tickets.filter(t => t.status === 'In Progress').length },
    { label: 'Open', count: tickets.filter(t => t.status === 'Open').length },
    { label: 'Resolved', count: tickets.filter(t => t.status === 'Resolved').length },
    { label: 'Closed', count: tickets.filter(t => t.status === 'Closed').length },
  ];
  const filtered = filter === 'All' ? tickets : tickets.filter(t => t.status === filter);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll('.ticket-card'));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          items.forEach((it, i) => {
            if (it.classList.contains('in')) return;
            setTimeout(() => it.classList.add('in'), i * 50);
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.06 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filter]);

  return (
    <div>
      <div className="tickets-header">
        <h1>My Tickets</h1>
      </div>
      <p className="tickets-subtitle">Track your support requests</p>
      <div className="products-search" style={{ marginBottom: 20 }}>
        <span className="search-icon"><Icon name="search" size={18} /></span>
        <input type="text" placeholder="Search by Ticket ID" />
      </div>
      <div className="filter-tabs">
        {filters.map(f => (
          <button key={f.label} className={`filter-tab ${filter === f.label ? 'active' : ''}`} onClick={() => setFilter(f.label)}>
            {f.label}<span className="filter-count">{f.count}</span>
          </button>
        ))}
      </div>
      {loading && (
        <div className="empty-state"><p>Loading tickets...</p></div>
      )}
      <div ref={listRef}>
        {!loading && filtered.map(ticket => (
          <div key={ticket.id} className="ticket-card" onClick={() => onSelectTicket(ticket)}>
            <div className={`ticket-status-dot ${ticket.status.toLowerCase().replace(' ', '-')}`}></div>
            <div className="ticket-card-body">
              <div className="ticket-card-top">
                <span className={`badge ${ticket.status === 'Open' ? 'badge-amber' : ticket.status === 'In Progress' ? 'badge-blue' : ticket.status === 'Resolved' ? 'badge-green' : 'badge-gray'}`}>{ticket.status}</span>
                <span className="ticket-card-id">{ticket.id}</span>
                <span className="ticket-card-date">{ticket.created}</span>
              </div>
              <div className="ticket-card-title">{ticket.title}</div>
              <div className="ticket-card-meta">Last updated: {ticket.updated}</div>
            </div>
            <div className="ticket-card-actions">
              <button className="btn-sm" onClick={(e) => { e.stopPropagation(); onSelectTicket(ticket); }}><Icon name="message-circle" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      {!loading && filtered.length === 0 && <div className="empty-state"><p>No tickets found for this filter.</p></div>}

      <div style={{ marginTop: 32, padding: '24px 0', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ textAlign: 'center', marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>Track Your Ticket in 4 Simple Steps</h3>
        <div className="status-stepper">
          {['Created', 'Assigned', 'In Progress', 'Resolved'].map((s, i) => (
            <Fragment key={s}>
              <div className="stepper-step">
                <div className="stepper-icon"><Icon name={i === 0 ? 'star' : i === 1 ? 'user' : i === 2 ? 'activity' : 'check-circle'} size={20} /></div>
                <span className="stepper-label">{s}</span>
              </div>
              {i < 3 && <div className="stepper-line"></div>}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

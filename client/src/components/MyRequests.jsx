import React, { useEffect, useState } from 'react';
import { api, timeAgo } from '../api.js';
import { SeverityPill, StatusPill } from './Pill.jsx';
import Thread from './Thread.jsx';

export default function MyRequests() {
  const [tickets, setTickets] = useState([]);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const load = () => api('/tickets/mine').then(setTickets).catch((e) => setError(e.message));
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  return (
    <section>
      <h1>My requests</h1>
      {error && <p className="error">{error}</p>}
      {tickets.length === 0 && <p className="muted">You have not raised any requests yet. Use Talk to an expert when you are ready.</p>}
      {tickets.map((t) => (
        <div key={t._id} className="card ticket">
          <div className="row-between">
            <h3>{t.subject}</h3>
            <StatusPill status={t.status} />
          </div>
          <p className="muted">{t.catalogItem?.name || t.department?.name} · sent {timeAgo(t.createdAt)} {t.anonymous && '· anonymous'}</p>
          <SeverityPill level={t.severity} />
          {t.status === 'open' && <p>Waiting for an expert to accept. Urgent requests are seen first.</p>}
          {t.status === 'escalated' && <p>Your request has been escalated so a senior staff member picks it up quickly.</p>}
          {t.assignedExpert && (
            <>
              <p><strong>{t.assignedExpert.name}</strong> <span className="muted">{t.assignedExpert.bio}</span></p>
              <button className="btn" onClick={() => setOpen(open === t._id ? null : t._id)}>
                {open === t._id ? 'Hide conversation' : 'Open conversation'}
              </button>
              {open === t._id && <Thread thread={`ticket:${t._id}`} />}
            </>
          )}
        </div>
      ))}
    </section>
  );
}

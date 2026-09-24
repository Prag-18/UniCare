import React, { useEffect, useRef, useState } from 'react';
import { api, timeAgo } from '../api.js';

// Shared chat for expert tickets ("ticket:<id>") and peer chats ("peer:<id>").
export default function Thread({ thread, placeholder = 'Write a message…' }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const load = () => api(`/threads/${thread}/messages`).then(setMsgs).catch((e) => setError(e.message));
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [thread]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [msgs.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) { setError('Type a message first.'); return; }
    try { await api(`/threads/${thread}/messages`, { method: 'POST', body: { text } }); setText(''); setError(''); load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="thread">
      <div className="thread-msgs">
        {msgs.length === 0 && <p className="muted">No messages yet. Say hello.</p>}
        {msgs.map((m) => (
          <div key={m._id} className={`bubble ${m.mine ? 'mine' : ''}`}>
            <div className="bubble-meta">{m.mine ? 'You' : m.senderLabel} · {timeAgo(m.createdAt)}</div>
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="thread-form" onSubmit={send}>
        <input value={text} onChange={(e) => { setText(e.target.value); setError(''); }} placeholder={placeholder} aria-label="Message" />
        <button className="btn primary">Send</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { api, timeAgo } from '../api.js';
import Thread from '../components/Thread.jsx';

export default function PeerHome({ user }) {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [story, setStory] = useState({ title: '', topic: '', body: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api('/peer-chats').then(setChats).catch((e) => setError(e.message)); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!story.title.trim() || story.body.trim().length < 40) { setError('Add a title and at least a few sentences.'); return; }
    try {
      await api('/stories', { method: 'POST', body: story });
      setStory({ title: '', topic: '', body: '' }); setError('');
      setMsg('Story submitted. It will appear for students once a moderator approves it.');
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="layout single">
      <main className="content">
        <h1>Peer mentor space</h1>
        <p className="lead">Students see you as {user.alias}. If someone mentions self-harm or feeling unsafe, share the Help now numbers and ask them to raise an expert request.</p>
        <div className="card">
          <h2>Students who reached out</h2>
          {chats.length === 0 && <p className="muted">No conversations yet.</p>}
          <ul className="plain-list">
            {chats.map((c) => (
              <li key={c._id} className="row-between">
                <span>{c.student.alias} <span className="muted">on {c.topic} · {timeAgo(c.updatedAt)}</span></span>
                <button className="btn" onClick={() => setActive(active?._id === c._id ? null : c)}>{active?._id === c._id ? 'Close' : 'Open chat'}</button>
              </li>
            ))}
          </ul>
          {active && <Thread thread={`peer:${active._id}`} />}
        </div>
        <form className="card form" onSubmit={submit}>
          <h2>Share your experience</h2>
          <label>Title<input value={story.title} onChange={(e) => setStory({ ...story, title: e.target.value })} /></label>
          <label>Topic<input value={story.topic} onChange={(e) => setStory({ ...story, topic: e.target.value })} placeholder="e.g. homesickness" /></label>
          <label>Your story<textarea rows={5} value={story.body} onChange={(e) => setStory({ ...story, body: e.target.value })} /></label>
          {error && <p className="error">{error}</p>}
          {msg && <p className="notice">{msg}</p>}
          <button className="btn primary">Submit for review</button>
        </form>
      </main>
    </div>
  );
}

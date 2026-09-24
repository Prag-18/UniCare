import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import Thread from './Thread.jsx';

export default function PeerSupport() {
  const [stories, setStories] = useState([]);
  const [peers, setPeers] = useState([]);
  const [chats, setChats] = useState([]);
  const [topic, setTopic] = useState('all');
  const [activeChat, setActiveChat] = useState(null);
  const [error, setError] = useState('');

  const loadChats = () => api('/peer-chats').then(setChats);
  useEffect(() => {
    Promise.all([api('/stories').then(setStories), api('/peers').then(setPeers), loadChats()]).catch((e) => setError(e.message));
  }, []);

  const topics = ['all', ...new Set(stories.map((s) => s.topic).filter(Boolean))];
  const shown = topic === 'all' ? stories : stories.filter((s) => s.topic === topic);

  const connect = async (peer) => {
    try {
      const chat = await api('/peer-chats', { method: 'POST', body: { peerId: peer._id, topic: peer.expertise[0] } });
      await loadChats();
      setActiveChat(chat);
    } catch (e) { setError(e.message); }
  };

  return (
    <section>
      <h1>Talk to peers</h1>
      <p className="lead">Seniors and alumni who went through the same thing. They are trained peer mentors, not counsellors. You appear to them by your alias only.</p>
      {error && <p className="error">{error}</p>}

      {activeChat && (
        <div className="card">
          <div className="row-between">
            <h2>Chat with {activeChat.peer.alias}</h2>
            <button className="btn ghost" onClick={() => setActiveChat(null)}>Close chat</button>
          </div>
          <Thread thread={`peer:${activeChat._id}`} />
        </div>
      )}

      {chats.length > 0 && !activeChat && (
        <div className="card">
          <h2>Your conversations</h2>
          <ul className="plain-list">
            {chats.map((c) => (
              <li key={c._id} className="row-between">
                <span>{c.peer.alias} <span className="muted">on {c.topic}</span></span>
                <button className="btn" onClick={() => setActiveChat(c)}>Open chat</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>Peer mentors available</h2>
      <div className="grid">
        {peers.map((p) => (
          <div key={p._id} className="card peer">
            <h3>{p.alias}</h3>
            <p>{p.bio}</p>
            <div className="chips">{p.expertise.map((e) => <span key={e} className="chip">{e}</span>)}</div>
            <button className="btn primary" onClick={() => connect(p)}>Start a chat</button>
          </div>
        ))}
      </div>

      <div className="row-between">
        <h2>Stories from seniors</h2>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Filter stories by topic">
          {topics.map((t) => <option key={t} value={t}>{t === 'all' ? 'All topics' : t}</option>)}
        </select>
      </div>
      <div className="stories">
        {shown.map((s) => (
          <article key={s._id} className="story">
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <p className="muted">{s.author?.alias} · {s.topic}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

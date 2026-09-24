import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { SeverityPill } from './Pill.jsx';

const ACTIONS = {
  help_now: { label: 'Call a helpline now', tab: null },
  expert: { label: 'Raise a request with an expert', tab: 'expert' },
  peer: { label: 'Chat with a senior', tab: 'peer' },
  stories: { label: "Read seniors' stories", tab: 'peer' },
  catalog: { label: 'Browse all services', tab: 'catalog' },
};

export default function Assistant({ onNavigate }) {
  const [msgs, setMsgs] = useState([
    { role: 'assistant', text: "Hi, I'm the CampusCare assistant. Tell me what's going on and I'll help you find the right support. I'm not a counsellor, but I can point you to one." },
  ]);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [msgs.length, result]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) { setError('Type a message first.'); return; }
    const next = [...msgs, { role: 'user', text: text.trim() }];
    setMsgs(next); setText(''); setBusy(true); setError('');
    try {
      const r = await api('/ai/chat', { method: 'POST', body: { messages: next } });
      setMsgs([...next, { role: 'assistant', text: r.reply }]);
      setResult(r);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <section>
      <h1>Ask the assistant</h1>
      <p className="lead">It checks how urgent things sound and suggests where to go next. It never replaces a person.</p>
      <div className="card assistant">
        <div className="thread-msgs">
          {msgs.map((m, i) => <div key={i} className={`bubble ${m.role === 'user' ? 'mine' : ''}`}>{m.text}</div>)}
          {busy && <div className="bubble muted">Thinking…</div>}
          <div ref={endRef} />
        </div>

        {result && (
          <div className={`triage sev-box-${result.severity}`}>
            <p><SeverityPill level={result.severity} /> {result.severity === 'crisis' ? 'Please reach out to someone right now.' : 'Assessment & Guidance'}</p>
            
            {result.recommendations?.length > 0 && (
              <div className="recommendations-box">
                <strong>Actionable steps for your situation:</strong>
                <ul className="recommendations-list">
                  {result.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.helpNow?.length > 0 && (
              <ul className="helpline-list">{result.helpNow.map((h) => <li key={h.phone}><a href={`tel:${h.phone.replace(/[^0-9]/g, '')}`}>{h.phone}</a> {h.name}</li>)}</ul>
            )}
            <div className="actions">
              {result.suggestions.filter((s) => ACTIONS[s]?.tab).map((s) => (
                <button key={s} className={`btn ${s === result.suggestions[0] ? 'primary' : ''}`}
                  onClick={() => onNavigate(ACTIONS[s].tab, s === 'expert' ? result.recommendedService : null)}>
                  {ACTIONS[s].label}
                </button>
              ))}
            </div>
            {result.recommendedService && (
              <p className="muted">Best match: {result.recommendedService.name} ({result.recommendedService.department.name})</p>
            )}
          </div>
        )}

        <form className="thread-form" onSubmit={send}>
          <input value={text} onChange={(e) => { setText(e.target.value); setError(''); }} placeholder="e.g. I've been feeling really low since exams started" aria-label="Message the assistant" />
          <button className="btn primary" disabled={busy}>Send</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}

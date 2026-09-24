import React, { useState } from 'react';
import { api, setToken } from '../api.js';

const ROLES = [
  { id: 'student', label: 'Student', demo: 'student@demo.com' },
  { id: 'expert', label: 'Expert', demo: 'expert@demo.com' },
  { id: 'peer', label: 'Peer mentor', demo: 'peer@demo.com' },
  { id: 'admin', label: 'Admin', demo: 'admin@demo.com' },
];

export default function Login({ onLogin }) {
  const [role, setRole] = useState('student');
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || (mode === 'register' && !form.name)) { setError('Fill in every field to continue.'); return; }
    setBusy(true);
    try {
      const res = mode === 'register'
        ? await api('/auth/register', { method: 'POST', body: form })
        : await api('/auth/login', { method: 'POST', body: { email: form.email, password: form.password, role } });
      setToken(res.token);
      onLogin(res.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const demo = ROLES.find((r) => r.id === role).demo;

  return (
    <main className="login">
      <section className="login-intro">
        <div className="brand large"><span className="brand-mark" aria-hidden="true" />CampusCare</div>
        <h1>One place to ask for help on campus.</h1>
        <p>Talk to seniors who have been through it, reach the right expert without chasing 12 offices, and get support while you wait.</p>
      </section>

      <form className="card login-card" onSubmit={submit}>
        <div className="segmented" role="tablist" aria-label="Sign in as">
          {ROLES.map((r) => (
            <button type="button" key={r.id} role="tab" aria-selected={role === r.id}
              className={role === r.id ? 'active' : ''} onClick={() => { setRole(r.id); setMode('signin'); setError(''); }}>
              {r.label}
            </button>
          ))}
        </div>

        <h2>{mode === 'register' ? 'Create a student account' : `Sign in as ${ROLES.find((r) => r.id === role).label.toLowerCase()}`}</h2>

        {mode === 'register' && (
          <label>Full name<input value={form.name} onChange={set('name')} autoComplete="name" /></label>
        )}
        <label>College email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password<input type="password" value={form.password} onChange={set('password')} autoComplete="current-password" /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}</button>

        {role === 'student' && (
          <button type="button" className="link" onClick={() => { setMode(mode === 'register' ? 'signin' : 'register'); setError(''); }}>
            {mode === 'register' ? 'I already have an account' : 'New here? Create a student account'}
          </button>
        )}
        {mode === 'signin' && (
          <button type="button" className="demo-hint" onClick={() => setForm({ ...form, email: demo, password: 'password123' })}>
            Use demo account: {demo}
          </button>
        )}
        <p className="fine">Your name is never shown to peers. You can raise requests anonymously.</p>
      </form>
    </main>
  );
}

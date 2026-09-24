import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { SeverityPill } from './Pill.jsx';

export default function ExpertRequest({ preselect, onDone }) {
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState({ catalogItem: preselect?._id || '', subject: '', description: '', anonymous: false, consentToShare: false });
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/catalog').then(setCatalog).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (preselect?._id) {
      setForm((f) => ({ ...f, catalogItem: preselect._id }));
    }
  }, [preselect]);

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) { setError('Add a short subject so the right expert can find your request.'); return; }
    if (form.description.trim().length < 20) { setError('Describe what you are going through in at least a sentence or two.'); return; }
    setBusy(true);
    try { setDone(await api('/tickets', { method: 'POST', body: { ...form, catalogItem: form.catalogItem || undefined } })); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (done) {
    const t = done.ticket;
    return (
      <section>
        <h1>Your request is in</h1>
        <div className="card">
          <p><SeverityPill level={t.severity} /></p>
          {t.severity === 'crisis' ? (
            <p>An on-call counsellor has been alerted right now. Please also call one of the numbers below. You do not have to wait.</p>
          ) : (
            <p>Experts from the right department can see your request now. You will be notified as soon as someone accepts it. While you wait, a senior in Talk to peers may have been through something similar.</p>
          )}
          {done.helpNow?.length > 0 && (
            <ul className="helpline-list">{done.helpNow.map((h) => <li key={h.phone}><a href={`tel:${h.phone.replace(/[^0-9]/g, '')}`}>{h.phone}</a> {h.name}</li>)}</ul>
          )}
          <button className="btn primary" onClick={onDone}>Track my request</button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1>Talk to an expert</h1>
      <p className="lead">Write what you are going through in your own words. We route it to the right department, so you do not have to work out which of 12 offices to contact.</p>
      <form className="card form" onSubmit={submit}>
        <label>What kind of help? <span className="muted">(optional, we can work it out)</span>
          <select value={form.catalogItem} onChange={set('catalogItem')}>
            <option value="">Not sure, route it for me</option>
            {catalog.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.department.name})</option>)}
          </select>
        </label>
        <label>Subject<input value={form.subject} onChange={set('subject')} placeholder="e.g. Can't sleep before exams" maxLength={120} /></label>
        <label>What's going on?
          <textarea rows={6} value={form.description} onChange={set('description')} placeholder="Share as much or as little as you're comfortable with." />
        </label>
        <fieldset className="privacy">
          <legend>Your privacy</legend>
          <label className="check"><input type="checkbox" checked={form.anonymous} onChange={set('anonymous')} />
            Keep me anonymous. Experts will not see my name.</label>
          <label className="check"><input type="checkbox" checked={form.consentToShare} onChange={set('consentToShare')} />
            Experts in other departments may read my request if it helps me get support faster.</label>
        </fieldset>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
      </form>
    </section>
  );
}

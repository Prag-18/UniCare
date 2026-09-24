import React, { useEffect, useState } from 'react';
import { api, timeAgo, timeLeft } from '../api.js';
import { SeverityPill, StatusPill } from '../components/Pill.jsx';
import Thread from '../components/Thread.jsx';

const DEFAULT_FILTERS = { department: 'mine', expertise: 'all', severity: 'all', status: 'all' };

export default function ExpertDashboard({ user }) {
  const [view, setView] = useState('queue');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [departments, setDepartments] = useState([]);
  const [expertiseTags, setExpertiseTags] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [reason, setReason] = useState('');
  const [openThread, setOpenThread] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/departments').then(setDepartments);
    api('/expertise').then(setExpertiseTags);
  }, []);

  const load = async () => {
    try {
      const qs = new URLSearchParams({ ...filters, view }).toString();
      const [t, s] = await Promise.all([api(`/tickets?${qs}`), api('/stats')]);
      setTickets(t); setStats(s); setError('');
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [filters, view]);

  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  const accept = async (t) => {
    try {
      await api(`/tickets/${t._id}/accept`, { method: 'POST' });
      setNotice(`You accepted "${t.subject}". The student has been notified.`);
      setView('mine'); setOpenThread(t._id);
    } catch (e) { setNotice(e.message); load(); }
  };
  const decline = async (t) => {
    if (!reason.trim()) { setError('Add a short reason so the case can be routed better.'); return; }
    try {
      const r = await api(`/tickets/${t._id}/decline`, { method: 'POST', body: { reason } });
      setNotice(r.status === 'escalated' ? 'Declined. Every expert in that department has passed, so the case has been escalated.' : 'Declined. The case stays in the queue for other experts.');
      setDeclining(null); setReason(''); load();
    } catch (e) { setError(e.message); }
  };
  const resolve = async (t) => {
    try { await api(`/tickets/${t._id}/resolve`, { method: 'POST' }); setNotice(`Marked "${t.subject}" as resolved.`); load(); }
    catch (e) { setError(e.message); }
  };

  const deptName = (id) => departments.find((d) => d._id === id)?.name;
  const myDeptNames = user.departments.map((d) => d.name || deptName(d)).join(', ');

  return (
    <div className="expert">
      <div className="expert-head">
        <div>
          <h1>Support queue</h1>
          <p className="muted">{user.name} · {myDeptNames} · expertise: {user.expertise.join(', ')}</p>
        </div>
        {stats && (
          <dl className="stats">
            <div><dt>Waiting across all departments</dt><dd>{stats.openByDepartment.reduce((s, d) => s + d.count, 0)}</dd></div>
            <div><dt>Past response deadline</dt><dd className={stats.overdue ? 'bad' : ''}>{stats.overdue}</dd></div>
            <div><dt>Average time to first response</dt><dd>{stats.avgFirstResponseHours} hr</dd></div>
          </dl>
        )}
      </div>

      <div className="segmented small" role="tablist">
        <button role="tab" aria-selected={view === 'queue'} className={view === 'queue' ? 'active' : ''} onClick={() => setView('queue')}>Open cases</button>
        <button role="tab" aria-selected={view === 'mine'} className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>My cases</button>
      </div>

      {view === 'queue' && (
        <div className="filters">
          <label>Department
            <select value={filters.department} onChange={setF('department')}>
              <option value="mine">My departments</option>
              <option value="all">All 12 departments</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </label>
          <label>Expertise
            <select value={filters.expertise} onChange={setF('expertise')}>
              <option value="all">Any expertise</option>
              <option value="mine">Matches my expertise</option>
              {expertiseTags.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label>Severity
            <select value={filters.severity} onChange={setF('severity')}>
              <option value="all">Any severity</option>
              <option value="crisis">Crisis</option><option value="high">High</option>
              <option value="moderate">Moderate</option><option value="low">Low</option>
            </select>
          </label>
          <label>Status
            <select value={filters.status} onChange={setF('status')}>
              <option value="all">Open and escalated</option>
              <option value="open">Open</option><option value="escalated">Escalated</option>
            </select>
          </label>
          <button className="btn ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>Reset filters</button>
        </div>
      )}

      {notice && <p className="notice" role="status">{notice} <button className="link" onClick={() => setNotice('')}>Dismiss</button></p>}
      {error && <p className="error">{error}</p>}

      {tickets.length === 0 && (
        <p className="muted empty">{view === 'mine' ? 'You have no cases yet. Accept one from Open cases.' : 'No cases match these filters. Try All 12 departments or Any expertise.'}</p>
      )}

      <div className="tickets">
        {tickets.map((t) => (
          <article key={t._id} className={`card ticket ${t.overdue ? 'overdue' : ''} sev-edge-${t.severity}`}>
            <div className="row-between">
              <h3>{t.subject}</h3>
              <div className="pills"><SeverityPill level={t.severity} /><StatusPill status={t.status} /></div>
            </div>
            <p className="muted">
              {t.department?.name}{t.catalogItem && ` · ${t.catalogItem.name}`} · {t.studentLabel} · {timeAgo(t.createdAt)}
              {t.status !== 'resolved' && <> · <span className={t.overdue ? 'bad' : ''}>{timeLeft(t.slaDueAt)}</span></>}
            </p>
            <p>{t.description}</p>
            <div className="chips">
              {t.expertiseNeeded.map((e) => <span key={e} className={`chip ${t.expertiseMatch.includes(e) ? 'match' : ''}`}>{e}</span>)}
              {!t.inMyDepartment && <span className="chip outside">Outside my departments</span>}
            </div>

            {view === 'queue' && declining !== t._id && (
              <div className="actions">
                <button className="btn primary" onClick={() => accept(t)}>Yes, I'll take this case</button>
                <button className="btn" onClick={() => { setDeclining(t._id); setError(''); }}>Not for me</button>
              </div>
            )}
            {declining === t._id && (
              <div className="decline">
                <label>Why is this not a fit?
                  <select value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }}>
                    <option value="">Choose a reason</option>
                    <option>Outside my expertise</option>
                    <option>At full caseload</option>
                    <option>Conflict of interest</option>
                    <option>Better suited to another department</option>
                  </select>
                </label>
                <div className="actions">
                  <button className="btn primary" onClick={() => decline(t)}>Decline case</button>
                  <button className="btn ghost" onClick={() => { setDeclining(null); setReason(''); }}>Cancel</button>
                </div>
              </div>
            )}

            {view === 'mine' && t.assignedToMe && (
              <>
                <div className="actions">
                  <button className="btn" onClick={() => setOpenThread(openThread === t._id ? null : t._id)}>
                    {openThread === t._id ? 'Hide conversation' : 'Message student'}
                  </button>
                  {t.status !== 'resolved' && <button className="btn ghost" onClick={() => resolve(t)}>Mark resolved</button>}
                </div>
                {openThread === t._id && <Thread thread={`ticket:${t._id}`} />}
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

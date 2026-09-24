import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

// SCALING demo: add a department, service or expert without touching code.
export default function AdminConsole() {
  const [departments, setDepartments] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [pending, setPending] = useState([]);
  const [dept, setDept] = useState({ name: '', code: '', description: '' });
  const [item, setItem] = useState({ name: '', department: '', description: '', expertiseTags: '', defaultSeverity: 'moderate' });
  const [expert, setExpert] = useState({ name: '', email: '', departments: '', expertise: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => Promise.all([
    api('/departments').then(setDepartments), api('/catalog').then(setCatalog), api('/admin/stories/pending').then(setPending),
  ]).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const run = async (fn, ok) => { try { await fn(); setMsg(ok); setError(''); load(); } catch (e) { setError(e.message); setMsg(''); } };
  const tags = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

  return (
    <div className="layout single">
      <main className="content">
        <h1>Admin: services and departments</h1>
        <p className="lead">{departments.length} departments and {catalog.length} services are live. New ones show up for students and experts immediately.</p>
        {msg && <p className="notice">{msg}</p>}
        {error && <p className="error">{error}</p>}
        <div className="grid two">
          <form className="card form" onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/departments', { method: 'POST', body: dept }), `Added ${dept.name}.`); setDept({ name: '', code: '', description: '' }); }}>
            <h2>Add a department</h2>
            <label>Name<input value={dept.name} onChange={(e) => setDept({ ...dept, name: e.target.value })} /></label>
            <label>Short code<input value={dept.code} onChange={(e) => setDept({ ...dept, code: e.target.value })} placeholder="e.g. LIB" maxLength={5} /></label>
            <label>Description<input value={dept.description} onChange={(e) => setDept({ ...dept, description: e.target.value })} /></label>
            <button className="btn primary">Add department</button>
          </form>
          <form className="card form" onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api('/admin/catalog', { method: 'POST', body: { ...item, expertiseTags: tags(item.expertiseTags) } });
              setItem({ name: '', department: '', description: '', expertiseTags: '', defaultSeverity: 'moderate' });
            }, `Added ${item.name} to the catalog.`);
          }}>
            <h2>Add a service to the catalog</h2>
            <label>Service name<input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} /></label>
            <label>Department
              <select value={item.department} onChange={(e) => setItem({ ...item, department: e.target.value })}>
                <option value="">Choose a department</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </label>
            <label>Description<input value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} /></label>
            <label>Expertise tags <span className="muted">(comma separated)</span><input value={item.expertiseTags} onChange={(e) => setItem({ ...item, expertiseTags: e.target.value })} /></label>
            <label>Default severity
              <select value={item.defaultSeverity} onChange={(e) => setItem({ ...item, defaultSeverity: e.target.value })}>
                <option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option>
              </select>
            </label>
            <button className="btn primary">Add service</button>
          </form>
          <form className="card form" onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api('/admin/experts', { method: 'POST', body: { ...expert, departments: expert.departments ? [expert.departments] : [], expertise: tags(expert.expertise) } });
              setExpert({ name: '', email: '', departments: '', expertise: '' });
            }, `Added ${expert.name}. Temporary password: password123`);
          }}>
            <h2>Add an expert</h2>
            <label>Name<input value={expert.name} onChange={(e) => setExpert({ ...expert, name: e.target.value })} /></label>
            <label>Email<input type="email" value={expert.email} onChange={(e) => setExpert({ ...expert, email: e.target.value })} /></label>
            <label>Department
              <select value={expert.departments} onChange={(e) => setExpert({ ...expert, departments: e.target.value })}>
                <option value="">Choose a department</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </label>
            <label>Expertise <span className="muted">(comma separated)</span><input value={expert.expertise} onChange={(e) => setExpert({ ...expert, expertise: e.target.value })} /></label>
            <button className="btn primary">Add expert</button>
          </form>
          <div className="card">
            <h2>Stories waiting for review</h2>
            {pending.length === 0 && <p className="muted">Nothing to review.</p>}
            {pending.map((s) => (
              <div key={s._id} className="story">
                <h3>{s.title}</h3><p>{s.body}</p>
                <button className="btn" onClick={() => run(() => api(`/admin/stories/${s._id}/approve`, { method: 'POST' }), 'Story published.')}>Approve and publish</button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

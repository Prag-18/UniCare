import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Catalog({ onRequest }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api('/catalog').then(setItems).catch((e) => setError(e.message)); }, []);

  const shown = items.filter((i) => `${i.name} ${i.description} ${i.department.name} ${i.expertiseTags.join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  const byDept = shown.reduce((acc, i) => { (acc[i.department.name] ||= []).push(i); return acc; }, {});

  return (
    <section>
      <h1>All services</h1>
      <p className="lead">Every support service on campus in one list. Pick one and your request goes straight to that team.</p>
      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search e.g. ragging, fees, sleep, backlog" aria-label="Search services" />
      {error && <p className="error">{error}</p>}
      {Object.keys(byDept).length === 0 && <p className="muted">No services match "{q}". Try a different word, or ask the assistant.</p>}
      {Object.entries(byDept).map(([dept, list]) => (
        <div key={dept} className="dept-group">
          <h2>{dept}</h2>
          <div className="grid">
            {list.map((i) => (
              <div key={i._id} className="card service">
                <h3>{i.name}</h3>
                <p>{i.description}</p>
                <button className="btn" onClick={() => onRequest(i)}>Request this</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

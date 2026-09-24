import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { SeverityPill } from './Pill.jsx';

export default function Catalog({ onRequest }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/catalog').then(setItems).catch((e) => setError(e.message));
  }, []);

  const departments = ['all', ...new Set(items.map((i) => i.department?.name).filter(Boolean))];

  const filtered = items.filter((i) => {
    const matchesDept = selectedDept === 'all' || i.department?.name === selectedDept;
    const matchesSearch = `${i.name} ${i.description} ${i.department?.name || ''} ${(i.expertiseTags || []).join(' ')}`
      .toLowerCase()
      .includes(q.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const byDept = filtered.reduce((acc, i) => {
    const deptName = i.department?.name || 'General Support';
    (acc[deptName] ||= []).push(i);
    return acc;
  }, {});

  return (
    <section className="catalog-section">
      <div className="catalog-header">
        <h1>All Support Services</h1>
        <p className="lead">
          Browse every campus support service in one place. Request help directly or let us route your request automatically.
        </p>
      </div>

      <div className="catalog-toolbar">
        <div className="search-wrapper">
          <input
            className="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by keyword, e.g. ragging, fees, stress, backlog..."
            aria-label="Search services"
          />
        </div>

        <div className="dept-pills" role="tablist" aria-label="Filter by department">
          {departments.map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={selectedDept === d}
              className={`dept-pill ${selectedDept === d ? 'active' : ''}`}
              onClick={() => setSelectedDept(d)}
            >
              {d === 'all' ? `All Services (${items.length})` : d}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {filtered.length === 0 && (
        <div className="card empty-state">
          <p className="muted">No support services match "{q}". Try searching a different keyword or view All Services.</p>
          <button className="btn primary" onClick={() => { setQ(''); setSelectedDept('all'); }}>Clear search filters</button>
        </div>
      )}

      {Object.entries(byDept).map(([dept, list]) => (
        <div key={dept} className="dept-group">
          <div className="dept-group-header">
            <h2>{dept}</h2>
            <span className="dept-count">{list.length} {list.length === 1 ? 'service' : 'services'}</span>
          </div>
          <div className="catalog-grid">
            {list.map((i) => (
              <article key={i._id} className="card service-card">
                <div className="service-card-top">
                  <span className="dept-tag">{i.department?.name}</span>
                  {i.defaultSeverity && <SeverityPill level={i.defaultSeverity} />}
                </div>

                <h3 className="service-title">{i.name}</h3>
                <p className="service-desc">{i.description}</p>

                {i.expertiseTags?.length > 0 && (
                  <div className="chips">
                    {i.expertiseTags.map((tag) => (
                      <span key={tag} className="chip">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="service-card-footer">
                  <button className="btn primary service-btn" onClick={() => onRequest(i)}>
                    Request this service &rarr;
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

import React, { useState } from 'react';
import HelpNow from '../components/HelpNow.jsx';
import PeerSupport from '../components/PeerSupport.jsx';
import ExpertRequest from '../components/ExpertRequest.jsx';
import Assistant from '../components/Assistant.jsx';
import Catalog from '../components/Catalog.jsx';
import MyRequests from '../components/MyRequests.jsx';

const TABS = [
  { id: 'peer', label: 'Talk to peers', hint: 'Seniors who have been there' },
  { id: 'expert', label: 'Talk to an expert', hint: 'One-to-one, private' },
  { id: 'assistant', label: 'Ask the assistant', hint: 'Not sure where to start?' },
  { id: 'catalog', label: 'All services', hint: '12 departments, one place' },
  { id: 'requests', label: 'My requests', hint: 'Status and replies' },
];

export default function StudentHome({ user }) {
  const [tab, setTab] = useState('peer');
  const [preselect, setPreselect] = useState(null);

  const go = (target, catalogItem) => {
    if (catalogItem) setPreselect(catalogItem);
    setTab(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="layout">
      <nav className="sidenav" aria-label="Student sections">
        <p className="greeting">Hi {user.alias}. What would help today?</p>
        {TABS.map((t) => (
          <button key={t.id} className={`nav-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span>{t.label}</span><small>{t.hint}</small>
          </button>
        ))}
        <HelpNow compact />
      </nav>
      <main className="content">
        <div className="mobile-only"><HelpNow compact /></div>
        {tab === 'peer' && <PeerSupport />}
        {tab === 'expert' && <ExpertRequest preselect={preselect} onDone={() => go('requests')} />}
        {tab === 'assistant' && <Assistant onNavigate={go} />}
        {tab === 'catalog' && <Catalog onRequest={(item) => go('expert', item)} />}
        {tab === 'requests' && <MyRequests />}
      </main>
    </div>
  );
}

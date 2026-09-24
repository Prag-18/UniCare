import React, { useEffect, useState } from 'react';
import { api, setToken, getToken } from './api.js';
import Login from './pages/Login.jsx';
import StudentHome from './pages/StudentHome.jsx';
import ExpertDashboard from './pages/ExpertDashboard.jsx';
import PeerHome from './pages/PeerHome.jsx';
import AdminConsole from './pages/AdminConsole.jsx';

const ROLE_LABEL = { student: 'Student', expert: 'Expert', peer: 'Peer mentor', admin: 'Admin' };

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api('/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const signOut = () => { setToken(null); setUser(null); };

  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Login onLogin={(u) => setUser(u)} />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />CampusCare</div>
        <div className="topbar-right">
          <span className="who">{user.role === 'student' || user.role === 'peer' ? user.alias : user.name}
            <span className="role-tag">{ROLE_LABEL[user.role]}</span></span>
          <button className="btn ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>
      {user.role === 'student' && <StudentHome user={user} />}
      {user.role === 'expert' && <ExpertDashboard user={user} />}
      {user.role === 'peer' && <PeerHome user={user} />}
      {user.role === 'admin' && <AdminConsole />}
    </div>
  );
}

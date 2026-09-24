import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

// Always visible on student screens: crisis help is never more than one tap away.
export default function HelpNow({ compact = false }) {
  const [lines, setLines] = useState([]);
  const [open, setOpen] = useState(!compact);
  useEffect(() => { api('/help-now').then(setLines).catch(() => {}); }, []);

  return (
    <aside className={`help-now ${open ? 'open' : ''}`} aria-label="Urgent help">
      <button className="help-now-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <strong>Need help right now?</strong> <span>{open ? 'Hide numbers' : 'Show helplines'}</span>
      </button>
      {open && (
        <ul>
          {lines.map((l) => (
            <li key={l.phone}><a href={`tel:${l.phone.replace(/[^0-9]/g, '')}`}>{l.phone}</a> {l.name}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}

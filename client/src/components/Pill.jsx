import React from 'react';

const SEVERITY_TEXT = { crisis: 'Crisis', high: 'High priority', moderate: 'Moderate', low: 'Low' };
const STATUS_TEXT = { open: 'Waiting for an expert', accepted: 'Expert assigned', resolved: 'Resolved', escalated: 'Escalated' };

export const SeverityPill = ({ level }) => <span className={`pill sev-${level}`}>{SEVERITY_TEXT[level]}</span>;
export const StatusPill = ({ status }) => <span className={`pill st-${status}`}>{STATUS_TEXT[status]}</span>;

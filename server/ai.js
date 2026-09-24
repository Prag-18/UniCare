// AI support assistant: estimates how urgent a student's need is and points
// them to the right feature (peer support, expert request, catalog service,
// or immediate crisis help). It guides, it never diagnoses.

export const HELP_NOW = [
  { name: 'Tele-MANAS (national mental health helpline, 24x7)', phone: '14416' },
  { name: 'UGC Anti-Ragging Helpline (24x7)', phone: '1800-180-5522' },
  { name: 'Emergency services', phone: '112' },
  { name: 'Campus counselling centre (update with your campus number)', phone: 'Ext. 1234' },
];

const CRISIS = ['suicide', 'kill myself', 'end my life', 'end it all', 'want to die', 'self harm', 'self-harm', 'hurt myself', 'cut myself', 'no reason to live', 'overdose'];
const HIGH = ['ragging', 'ragged', 'harass', 'assault', 'abuse', 'threat', 'unsafe', 'bully', 'panic attack', "can't breathe", 'not eating', "haven't slept", 'hopeless'];
const MODERATE = ['anxious', 'anxiety', 'depressed', 'depression', 'stress', 'lonely', 'fail', 'backlog', 'crying', 'overwhelmed', 'sad', 'homesick', 'fees', 'money'];

// keyword -> department code, used to recommend a catalog service
const ROUTES = [
  [['ragging', 'ragged', 'senior', 'bully'], 'ARC'],
  [['harass', 'assault', 'abuse', 'stalk'], 'ICC'],
  [['anxious', 'anxiety', 'depressed', 'depression', 'sad', 'lonely', 'panic', 'crying', 'hopeless', 'overwhelmed'], 'CMH'],
  [['exam', 'backlog', 'attendance', 'grade', 'fail', 'professor', 'study'], 'ACA'],
  [['fees', 'money', 'scholarship', 'loan'], 'FIN'],
  [['hostel', 'roommate', 'mess', 'room'], 'HOS'],
  [['sick', 'pain', 'fever', 'injury', 'sleep'], 'HLT'],
  [['disability', 'accessib', 'adhd', 'dyslexia'], 'DIS'],
  [['placement', 'internship', 'career', 'job'], 'CAR'],
  [['visa', 'international', 'foreign'], 'INT'],
];

const has = (text, words) => words.some((w) => text.includes(w));

export function ruleBasedAssess(text) {
  const t = text.toLowerCase();
  let severity = 'low';
  if (has(t, MODERATE)) severity = 'moderate';
  if (has(t, HIGH)) severity = 'high';
  if (has(t, CRISIS)) severity = 'crisis';
  const route = ROUTES.find(([words]) => has(t, words));
  return { severity, departmentCode: route ? route[1] : 'CMH' };
}

function buildReply({ severity }) {
  switch (severity) {
    case 'crisis':
      return "Thank you for telling me. What you're feeling matters, and you deserve support right now. Please call one of the Help now numbers below; they're free and available any time. I can also send an urgent request to an on-call counsellor for you.";
    case 'high':
      return "That sounds serious, and you shouldn't have to handle it alone. I'd recommend raising a priority request with an expert. It goes to the top of their queue. If you ever feel unsafe, use the Help now numbers.";
    case 'moderate':
      return "That sounds really tough. Many students go through this. Talking to a senior who's been there can help, and so can a one-to-one with an expert. I've suggested both below.";
    default:
      return "Thanks for sharing. Reading how seniors handled something similar is a good start, and you can browse campus services or talk to an expert whenever you want.";
  }
}

function suggestionsFor(severity) {
  if (severity === 'crisis') return ['help_now', 'expert'];
  if (severity === 'high') return ['expert', 'help_now'];
  if (severity === 'moderate') return ['peer', 'expert', 'catalog'];
  return ['stories', 'peer', 'catalog'];
}

const SYSTEM_PROMPT = `You are the support assistant on a university student wellbeing portal.
You do not diagnose. You listen, respond warmly in 2-4 short sentences, estimate urgency, and point the student to portal features.
Features: "stories" (seniors' experiences), "peer" (chat with a trained senior peer mentor), "expert" (raise a one-to-one request with a professional), "catalog" (browse campus services), "help_now" (crisis helplines).
Severity: "low" (general worry), "moderate" (ongoing distress affecting studies/life), "high" (ragging, harassment, feeling unsafe, severe distress), "crisis" (any risk of self-harm or suicide, or danger to life).
For crisis, always include "help_now" first and never suggest "peer".
Department codes: CMH counselling/mental health, ACA academic, ARC anti-ragging, HOS hostel, FIN financial aid, HLT health centre, DIS disability support, INT international students, CAR career, ICC harassment complaints, SWO student welfare, WEL wellness.
Reply with ONLY JSON: {"reply": string, "severity": "low|moderate|high|crisis", "suggestions": string[], "departmentCode": string}`;

async function claudeAssess(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
    }),
  });
  if (!res.ok) throw new Error(`AI API ${res.status}`);
  const data = await res.json();
  const text = data.content.map((c) => c.text || '').join('').replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

export async function assess(messages) {
  const studentText = messages.filter((m) => m.role !== 'assistant').map((m) => m.text).join(' ');
  const rules = ruleBasedAssess(studentText);
  let result;
  if (process.env.ANTHROPIC_API_KEY) {
    try { result = await claudeAssess(messages); } catch (e) { console.warn('AI fallback:', e.message); }
  }
  if (!result) {
    result = { ...rules, reply: buildReply(rules), suggestions: suggestionsFor(rules.severity) };
  }
  // Safety net: keyword crisis detection always wins, whatever the model said.
  if (rules.severity === 'crisis') {
    result.severity = 'crisis';
    result.suggestions = ['help_now', 'expert'];
  }
  result.helpNow = result.severity === 'crisis' || result.severity === 'high' ? HELP_NOW : [];
  return result;
}

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

const SITUATIONAL_RECOMMENDATIONS = {
  ARC: [
    'Document dates, times, locations, and names or descriptions of anyone involved.',
    'Keep screenshots of text messages, call logs, or any digital evidence safely.',
    'Avoid isolated areas at night and travel across campus with friends or peers.',
    'Save campus security and anti-ragging helpline numbers on your phone speed dial.',
  ],
  ICC: [
    'Save all relevant communication (messages, emails, call records) securely.',
    'Write down a clear timeline of events while details are fresh in your mind.',
    'Confide in a trusted friend or mentor so you are not handling this alone.',
    'Know your rights under campus conduct and anti-harassment policies.',
  ],
  CMH: [
    'Try 5-4-3-2-1 grounding: notice 5 things around you, 4 textures, 3 sounds, 2 smells, 1 taste.',
    'Practice 4-7-8 breathing: inhale for 4 seconds, hold for 7, exhale slowly for 8.',
    'Take a short 10-minute walk outdoors to step away from screen and mental pressure.',
    'Write down your main worries on paper to help clear mental clutter.',
  ],
  ACA: [
    'Break study topics into 25-minute Pomodoro focus blocks with short rest breaks.',
    'Prioritize high-yield topics and previous year exam questions first.',
    'Visit faculty during office hours or ask course TAs for targeted guidance.',
    'Draft a daily realistic study checklist instead of trying to revise everything at once.',
  ],
  FIN: [
    'Contact the financial aid office to request a temporary fee extension.',
    'Check eligibility for emergency student welfare grants and scholarships.',
    'Inquire about campus work-study programs or department assistantships.',
  ],
  HOS: [
    'Schedule a friendly, neutral conversation with your roommate about quiet hours.',
    'Use earplugs or white-noise audio to protect your sleep schedule.',
    'Contact your hostel warden or resident advisor if living conditions remain unlivable.',
  ],
  HLT: [
    'Maintain a regular sleep schedule and avoid caffeine after 5 PM.',
    'Visit the campus health center for a quick routine checkup or vitals check.',
    'Stay well hydrated and ensure you are taking regular meal breaks.',
  ],
  DIS: [
    'Identify specific classroom or exam accommodations that would assist your learning.',
    'Gather diagnostic or medical documentation required for official accommodations.',
    'Speak with course instructors early in the term regarding accessibility needs.',
  ],
  CAR: [
    'Focus on preparing 2-3 core technical skills or projects rather than overextending.',
    'Have a peer mentor review your resume for formatting and clarity.',
    'Practice mock interview questions with friends to build speaking confidence.',
  ],
  INT: [
    'Connect with international student groups or campus cultural clubs.',
    'Verify visa and immigration paperwork deadlines with the international office.',
    'Schedule regular video catch-ups with family back home to ease homesickness.',
  ],
  DEFAULT: [
    'Take things one step at a time and focus on what is within your control today.',
    'Share what you are experiencing with a trusted friend, family member, or mentor.',
    'Maintain your basic daily routines: regular meals, hydration, and adequate sleep.',
  ],
};

const has = (text, words) => words.some((w) => text.includes(w));

export function ruleBasedAssess(text) {
  const t = text.toLowerCase();
  let severity = 'low';
  if (has(t, MODERATE)) severity = 'moderate';
  if (has(t, HIGH)) severity = 'high';
  if (has(t, CRISIS)) severity = 'crisis';
  const route = ROUTES.find(([words]) => has(t, words));
  const deptCode = route ? route[1] : 'CMH';
  const recommendations = SITUATIONAL_RECOMMENDATIONS[deptCode] || SITUATIONAL_RECOMMENDATIONS.DEFAULT;
  return { severity, departmentCode: deptCode, recommendations };
}

function buildReply({ severity }) {
  switch (severity) {
    case 'crisis':
      return "Thank you for telling me. What you're feeling matters, and you deserve support right now. Please call one of the Help now numbers below; they're free and available any time. Here are immediate coping steps you can take right now, alongside reaching out to a counsellor.";
    case 'high':
      return "That sounds serious, and you shouldn't have to handle it alone. I've highlighted key immediate actions and safety steps you can take below, as well as how to get an expert on your side fast.";
    case 'moderate':
      return "That sounds really tough, but there are practical steps you can take right now to regain control. Here are key recommendations for your situation, along with options to talk to peers or experts.";
    default:
      return "Thanks for sharing. Beyond browsing campus services, here are a few practical steps and habits you can try today to help navigate this situation.";
  }
}

function suggestionsFor(severity) {
  if (severity === 'crisis') return ['help_now', 'expert'];
  if (severity === 'high') return ['expert', 'help_now'];
  if (severity === 'moderate') return ['peer', 'expert', 'catalog'];
  return ['stories', 'peer', 'catalog'];
}

const SYSTEM_PROMPT = `You are the support assistant on a university student wellbeing portal.
You do not diagnose. You listen, respond warmly in 2-4 short sentences, estimate urgency, point the student to portal features, and provide 3-4 practical, immediate self-help recommendations/coping steps tailored to their situation (e.g. study techniques, grounding exercises, document safety tips, sleep hygiene, etc.).
Features: "stories" (seniors' experiences), "peer" (chat with a trained senior peer mentor), "expert" (raise a one-to-one request with a professional), "catalog" (browse campus services), "help_now" (crisis helplines).
Severity: "low" (general worry), "moderate" (ongoing distress affecting studies/life), "high" (ragging, harassment, feeling unsafe, severe distress), "crisis" (any risk of self-harm or suicide, or danger to life).
For crisis, always include "help_now" first and never suggest "peer".
Department codes: CMH counselling/mental health, ACA academic, ARC anti-ragging, HOS hostel, FIN financial aid, HLT health centre, DIS disability support, INT international students, CAR career, ICC harassment complaints, SWO student welfare, WEL wellness.
Reply with ONLY JSON: {"reply": string, "severity": "low|moderate|high|crisis", "suggestions": string[], "recommendations": string[], "departmentCode": string}`;

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
      max_tokens: 600,
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
    result = { ...rules, reply: buildReply(rules), suggestions: suggestionsFor(rules.severity), recommendations: rules.recommendations };
  }
  if (!result.recommendations || !result.recommendations.length) {
    result.recommendations = rules.recommendations;
  }
  // Safety net: keyword crisis detection always wins, whatever the model said.
  if (rules.severity === 'crisis') {
    result.severity = 'crisis';
    result.suggestions = ['help_now', 'expert'];
  }
  result.helpNow = result.severity === 'crisis' || result.severity === 'high' ? HELP_NOW : [];
  return result;
}

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  Department, CatalogItem, User, Ticket, Message, PeerChat, Story, AccessLog, SLA_HOURS,
} from './models.js';
import { assess, HELP_NOW } from './ai.js';
import { seed, makeAlias } from './seed.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const SEVERITY_RANK = { crisis: 0, high: 1, moderate: 2, low: 3 };
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const idEq = (a, b) => a && b && String(a._id || a) === String(b._id || b);

// ---------- auth ----------
const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, role: u.role, alias: u.alias,
  departments: u.departments, expertise: u.expertise, bio: u.bio,
});
const sign = (u) => jwt.sign({ id: u._id, role: u.role }, JWT_SECRET, { expiresIn: '8h' });

async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { id } = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(id);
    if (!req.user) throw new Error();
    next();
  } catch { res.status(401).json({ error: 'Please sign in again.' }); }
}
const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have access to this.' });

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password, role } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  if (role && role !== user.role && !(role === 'student' && user.role === 'peer'))
    return res.status(403).json({ error: `This account is not a ${role} account.` });
  res.json({ token: sign(user), user: publicUser(await user.populate('departments')) });
}));

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, email and a 6+ character password are required.' });
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = await User.create({
    name, email, role: 'student', alias: makeAlias(), passwordHash: await bcrypt.hash(password, 10),
  });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));

app.get('/api/me', auth, wrap(async (req, res) => {
  res.json(publicUser(await req.user.populate('departments')));
}));

// ---------- departments & catalog (SCALING) ----------
app.get('/api/departments', auth, wrap(async (_req, res) => {
  res.json(await Department.find({ active: true }).sort('name'));
}));
app.get('/api/catalog', auth, wrap(async (_req, res) => {
  res.json(await CatalogItem.find({ active: true }).populate('department').sort('name'));
}));
app.get('/api/expertise', auth, wrap(async (_req, res) => {
  const tags = await CatalogItem.distinct('expertiseTags');
  res.json(tags.sort());
}));
app.post('/api/admin/departments', auth, allow('admin'), wrap(async (req, res) => {
  const { name, code, description } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Name and code are required.' });
  res.status(201).json(await Department.create({ name, code: code.toUpperCase(), description }));
}));
app.post('/api/admin/catalog', auth, allow('admin'), wrap(async (req, res) => {
  const { name, department, description, expertiseTags = [], defaultSeverity } = req.body;
  if (!name || !department) return res.status(400).json({ error: 'Name and department are required.' });
  const item = await CatalogItem.create({ name, department, description, expertiseTags, defaultSeverity });
  res.status(201).json(await item.populate('department'));
}));
app.post('/api/admin/experts', auth, allow('admin'), wrap(async (req, res) => {
  const { name, email, password = 'password123', departments = [], expertise = [], bio } = req.body;
  const user = await User.create({
    name, email, role: 'expert', departments, expertise, bio, passwordHash: await bcrypt.hash(password, 10),
  });
  res.status(201).json(publicUser(await user.populate('departments')));
}));

// ---------- AI assistant ----------
app.post('/api/ai/chat', auth, allow('student', 'peer'), wrap(async (req, res) => {
  const messages = (req.body.messages || []).slice(-12);
  if (!messages.length) return res.status(400).json({ error: 'Type a message first.' });
  const result = await assess(messages);
  const dept = await Department.findOne({ code: result.departmentCode });
  const recommended = dept ? await CatalogItem.findOne({ department: dept._id, active: true }).populate('department') : null;
  res.json({ ...result, recommendedService: recommended });
}));
app.get('/api/help-now', (_req, res) => res.json(HELP_NOW));

// ---------- peer support ----------
app.get('/api/stories', auth, wrap(async (req, res) => {
  const filter = { approved: true };
  if (req.query.topic) filter.topic = req.query.topic;
  const stories = await Story.find(filter).populate('author', 'alias bio').sort('-createdAt');
  res.json(stories);
}));
app.post('/api/stories', auth, allow('peer'), wrap(async (req, res) => {
  const { title, topic, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and story are required.' });
  // Stories are moderated: they appear after an admin approves them.
  res.status(201).json(await Story.create({ author: req.user._id, title, topic, body, approved: false }));
}));
app.get('/api/admin/stories/pending', auth, allow('admin'), wrap(async (_req, res) => {
  res.json(await Story.find({ approved: false }).populate('author', 'alias'));
}));
app.post('/api/admin/stories/:id/approve', auth, allow('admin'), wrap(async (req, res) => {
  res.json(await Story.findByIdAndUpdate(req.params.id, { approved: true }, { new: true }));
}));

app.get('/api/peers', auth, wrap(async (_req, res) => {
  // PRIVACY: peer mentors are shown by alias only
  const peers = await User.find({ role: 'peer' }).select('alias expertise bio');
  res.json(peers);
}));
app.post('/api/peer-chats', auth, allow('student'), wrap(async (req, res) => {
  const { peerId, topic } = req.body;
  const peer = await User.findOne({ _id: peerId, role: 'peer' });
  if (!peer) return res.status(404).json({ error: 'That peer mentor is not available.' });
  let chat = await PeerChat.findOne({ student: req.user._id, peer: peer._id, status: 'active' });
  if (!chat) chat = await PeerChat.create({ student: req.user._id, peer: peer._id, topic });
  res.status(201).json(await chat.populate([{ path: 'peer', select: 'alias expertise' }, { path: 'student', select: 'alias' }]));
}));
app.get('/api/peer-chats', auth, allow('student', 'peer'), wrap(async (req, res) => {
  const filter = req.user.role === 'peer' ? { peer: req.user._id } : { student: req.user._id };
  res.json(await PeerChat.find(filter).populate('peer', 'alias expertise').populate('student', 'alias').sort('-updatedAt'));
}));

// ---------- tickets: one-to-one expert help ----------
const slaFor = (severity) => new Date(Date.now() + SLA_HOURS[severity] * 3600 * 1000);

app.post('/api/tickets', auth, allow('student'), wrap(async (req, res) => {
  const { subject, description, catalogItem, anonymous = false, consentToShare = false } = req.body;
  if (!subject || !description) return res.status(400).json({ error: 'Add a short subject and describe what you are going through.' });
  let item = catalogItem ? await CatalogItem.findById(catalogItem) : null;
  const ai = await assess([{ role: 'user', text: `${subject}. ${description}` }]);
  let dept = null;
  if (item) {
    dept = await Department.findById(item.department);
  } else {
    dept = await Department.findOne({ code: ai.departmentCode });
    if (!dept) dept = await Department.findOne({ code: 'CMH' }) || await Department.findOne();
    item = await CatalogItem.findOne({ department: dept?._id });
  }

  const departmentId = item?.department || dept?._id;
  if (!departmentId) return res.status(400).json({ error: 'No support department available for this request.' });

  // Take the more serious of the service default and the AI estimate.
  let severity = ai.severity;
  if (item && SEVERITY_RANK[item.defaultSeverity] < SEVERITY_RANK[severity]) severity = item.defaultSeverity;
  const ticket = await Ticket.create({
    student: req.user._id, anonymous, consentToShare, subject, description, severity,
    catalogItem: item?._id, department: departmentId, expertiseNeeded: item?.expertiseTags || [],
    aiSummary: `AI estimate: ${ai.severity}. Suggested department: ${dept?.code || ai.departmentCode}.`,
    status: severity === 'crisis' ? 'escalated' : 'open',
    slaDueAt: slaFor(severity),
  });
  res.status(201).json({ ticket, helpNow: ai.helpNow });
}));

app.get('/api/tickets/mine', auth, allow('student'), wrap(async (req, res) => {
  const tickets = await Ticket.find({ student: req.user._id })
    .populate('department', 'name').populate('catalogItem', 'name').populate('assignedExpert', 'name bio')
    .sort('-createdAt');
  res.json(tickets);
}));

// PRIVACY: what an expert may see depends on their relationship to the ticket.
function expertView(t, expert) {
  const mine = idEq(t.assignedExpert, expert._id);
  const inDept = (expert.departments || []).some((d) => idEq(d, t.department));
  const canReadDetails = mine || inDept || t.consentToShare;
  const studentLabel = t.anonymous ? 'Anonymous student'
    : mine ? t.student?.name : `${t.student?.alias || 'Student'} (name shown after accepting)`;
  const expertiseMatch = (t.expertiseNeeded || []).filter((e) => (expert.expertise || []).includes(e));
  return {
    _id: t._id, subject: t.subject, severity: t.severity, status: t.status,
    department: t.department, catalogItem: t.catalogItem, expertiseNeeded: t.expertiseNeeded,
    expertiseMatch, inMyDepartment: inDept, assignedToMe: mine,
    assignedExpert: t.assignedExpert ? { _id: t.assignedExpert._id, name: t.assignedExpert.name } : null,
    description: canReadDetails ? t.description : 'Details are visible to the owning department, or once you accept this case.',
    aiSummary: t.aiSummary, studentLabel, anonymous: t.anonymous, consentToShare: t.consentToShare,
    slaDueAt: t.slaDueAt, overdue: t.status !== 'resolved' && t.slaDueAt < new Date(),
    createdAt: t.createdAt, acceptedAt: t.acceptedAt,
  };
}

app.get('/api/tickets', auth, allow('expert'), wrap(async (req, res) => {
  const { department, expertise, status, severity, view } = req.query;
  const me = req.user;
  const filter = {};
  if (view === 'mine') filter.assignedExpert = me._id;
  else filter['declinedBy.expert'] = { $ne: me._id };           // hide cases I declined
  if (status && status !== 'all') filter.status = status;
  else if (view !== 'mine') filter.status = { $in: ['open', 'escalated'] };
  if (severity && severity !== 'all') filter.severity = severity;
  if (department === 'mine') filter.department = { $in: me.departments };
  else if (department && department !== 'all') filter.department = department;
  if (expertise === 'mine') filter.expertiseNeeded = { $in: me.expertise };
  else if (expertise && expertise !== 'all') filter.expertiseNeeded = expertise;

  const tickets = await Ticket.find(filter)
    .populate('department', 'name code').populate('catalogItem', 'name')
    .populate('student', 'name alias').populate('assignedExpert', 'name');
  const out = tickets.map((t) => expertView(t, me)).sort((a, b) =>
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || new Date(a.slaDueAt) - new Date(b.slaDueAt));
  res.json(out);
}));

app.get('/api/tickets/:id', auth, wrap(async (req, res) => {
  const t = await Ticket.findById(req.params.id)
    .populate('department', 'name code').populate('catalogItem', 'name')
    .populate('student', 'name alias').populate('assignedExpert', 'name bio');
  if (!t) return res.status(404).json({ error: 'Ticket not found.' });
  if (req.user.role === 'student') {
    if (!idEq(t.student, req.user._id)) return res.status(403).json({ error: 'Not your ticket.' });
    return res.json(t);
  }
  if (req.user.role !== 'expert') return res.status(403).json({ error: 'You do not have access to this.' });
  await AccessLog.create({ user: req.user._id, ticket: t._id, action: 'view' });
  res.json(expertView(t, req.user));
}));

app.post('/api/tickets/:id/accept', auth, allow('expert'), wrap(async (req, res) => {
  const t = await Ticket.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ['open', 'escalated'] }, assignedExpert: null },
    { status: 'accepted', assignedExpert: req.user._id, acceptedAt: new Date() },
    { new: true },
  );
  if (!t) return res.status(409).json({ error: 'Another expert has already accepted this case.' });
  await AccessLog.create({ user: req.user._id, ticket: t._id, action: 'accept' });
  await Message.create({
    thread: `ticket:${t._id}`, sender: req.user._id, senderLabel: `${req.user.name} (Expert)`,
    text: `Hi, I'm ${req.user.name}. I've picked up your request and I'm here to help. When would be a good time to talk?`,
  });
  res.json(t);
}));

app.post('/api/tickets/:id/decline', auth, allow('expert'), wrap(async (req, res) => {
  const t = await Ticket.findById(req.params.id);
  if (!t || t.status === 'resolved') return res.status(404).json({ error: 'Ticket not found.' });
  if (!t.declinedBy.some((d) => idEq(d.expert, req.user._id))) {
    t.declinedBy.push({ expert: req.user._id, reason: req.body.reason || 'Not the right fit', at: new Date() });
  }
  // If every expert in the department has declined, escalate so no one falls through the cracks.
  const deptExperts = await User.countDocuments({ role: 'expert', departments: t.department });
  if (t.declinedBy.length >= Math.max(deptExperts, 1)) t.status = 'escalated';
  await t.save();
  await AccessLog.create({ user: req.user._id, ticket: t._id, action: 'decline' });
  res.json({ ok: true, status: t.status });
}));

app.post('/api/tickets/:id/resolve', auth, allow('expert'), wrap(async (req, res) => {
  const t = await Ticket.findOneAndUpdate(
    { _id: req.params.id, assignedExpert: req.user._id },
    { status: 'resolved', resolvedAt: new Date() }, { new: true },
  );
  if (!t) return res.status(404).json({ error: 'Only the assigned expert can resolve this case.' });
  res.json(t);
}));

app.get('/api/stats', auth, allow('expert', 'admin'), wrap(async (_req, res) => {
  const open = await Ticket.aggregate([
    { $match: { status: { $in: ['open', 'escalated'] } } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
  ]);
  const overdue = await Ticket.countDocuments({ status: { $in: ['open', 'escalated'] }, slaDueAt: { $lt: new Date() } });
  const accepted = await Ticket.find({ acceptedAt: { $ne: null } }).select('createdAt acceptedAt');
  const avgHours = accepted.length
    ? accepted.reduce((s, t) => s + (t.acceptedAt - t.createdAt), 0) / accepted.length / 3600000 : 0;
  res.json({ openByDepartment: open, overdue, avgFirstResponseHours: Math.round(avgHours * 10) / 10 });
}));

// ---------- messages (expert tickets + peer chats) ----------
async function canUseThread(user, thread) {
  const [kind, id] = thread.split(':');
  if (!mongoose.isValidObjectId(id)) return null;
  if (kind === 'ticket') {
    const t = await Ticket.findById(id);
    if (!t) return null;
    if (idEq(t.student, user._id)) return t.anonymous ? 'Anonymous student' : user.name;
    if (idEq(t.assignedExpert, user._id)) return `${user.name} (Expert)`;
  }
  if (kind === 'peer') {
    const c = await PeerChat.findById(id);
    if (!c) return null;
    if (idEq(c.student, user._id)) return user.alias || 'Student';
    if (idEq(c.peer, user._id)) return `${user.alias} (Peer mentor)`;
  }
  return null;
}

app.get('/api/threads/:thread/messages', auth, wrap(async (req, res) => {
  if (!(await canUseThread(req.user, req.params.thread))) return res.status(403).json({ error: 'You are not part of this conversation.' });
  const msgs = await Message.find({ thread: req.params.thread }).sort('createdAt').limit(200);
  res.json(msgs.map((m) => ({ _id: m._id, text: m.text, senderLabel: m.senderLabel, mine: idEq(m.sender, req.user._id), createdAt: m.createdAt })));
}));
app.post('/api/threads/:thread/messages', auth, wrap(async (req, res) => {
  const label = await canUseThread(req.user, req.params.thread);
  if (!label) return res.status(403).json({ error: 'You are not part of this conversation.' });
  if (!req.body.text?.trim()) return res.status(400).json({ error: 'Type a message first.' });
  const m = await Message.create({ thread: req.params.thread, sender: req.user._id, senderLabel: label, text: req.body.text.trim() });
  res.status(201).json(m);
}));

// ---------- errors ----------
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// ---------- SLA watcher: open tickets past their deadline are escalated ----------
function startSlaWatcher() {
  setInterval(async () => {
    const r = await Ticket.updateMany(
      { status: 'open', slaDueAt: { $lt: new Date() } }, { status: 'escalated' },
    );
    if (r.modifiedCount) console.log(`Escalated ${r.modifiedCount} overdue ticket(s)`);
  }, 60 * 1000);
}

async function start() {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('campuscare');
    console.log('Using in-memory MongoDB (data resets on restart)');
  }
  await mongoose.connect(uri);
  if ((await Department.countDocuments()) === 0) { await seed(); console.log('Seeded demo data'); }
  startSlaWatcher();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`CampusCare API on http://localhost:${port}`));
}
start().catch((e) => { console.error(e); process.exit(1); });

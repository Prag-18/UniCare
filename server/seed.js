import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import {
  Department, CatalogItem, User, Ticket, Message, PeerChat, Story, AccessLog, SLA_HOURS,
} from './models.js';

const ADJ = ['Quiet', 'Bright', 'Gentle', 'Brave', 'Calm', 'Kind', 'Steady', 'Swift', 'Warm', 'Clear'];
const NOUN = ['Heron', 'Banyan', 'Lotus', 'Kestrel', 'Monsoon', 'Comet', 'Otter', 'Maple', 'Harbor', 'Falcon'];
export const makeAlias = () =>
  `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]}`;

// The scenario's 12 fragmented departments
const DEPARTMENTS = [
  ['Counselling & Mental Health', 'CMH', 'Professional counsellors and psychologists'],
  ['Academic Affairs', 'ACA', 'Exams, backlogs, attendance and academic stress'],
  ['Anti-Ragging Cell', 'ARC', 'Confidential handling of ragging complaints'],
  ['Hostel & Residence', 'HOS', 'Roommates, hostel life and living conditions'],
  ['Financial Aid & Scholarships', 'FIN', 'Fees, scholarships and emergency funds'],
  ['Health Centre', 'HLT', 'Physical health, sleep and medical care'],
  ['Disability Support', 'DIS', 'Accommodations and accessibility'],
  ['International Students Office', 'INT', 'Visa, culture and settling in'],
  ['Career & Placement', 'CAR', 'Placement pressure and career guidance'],
  ['Internal Complaints Committee', 'ICC', 'Harassment and misconduct complaints'],
  ['Student Welfare Office', 'SWO', 'Dean of students and general welfare'],
  ['Wellness & Mindfulness', 'WEL', 'Workshops, yoga and stress management'],
];

const CATALOG = [
  ['One-to-one counselling session', 'CMH', 'Talk privately with a trained counsellor.', ['anxiety', 'low mood', 'stress'], 'moderate'],
  ['Urgent counsellor callback', 'CMH', 'For when you need to talk to someone today.', ['crisis support', 'anxiety'], 'high'],
  ['Exam stress & backlog guidance', 'ACA', 'Plan a way through exams, backlogs or attendance issues.', ['academic stress', 'study skills'], 'low'],
  ['Report ragging (confidential)', 'ARC', 'Report ragging safely. Your identity is protected.', ['ragging', 'safety'], 'high'],
  ['Hostel & roommate support', 'HOS', 'Help with roommate conflict or hostel problems.', ['conflict resolution', 'homesickness'], 'low'],
  ['Fee & scholarship help', 'FIN', 'Support with fees, scholarships or emergency funds.', ['financial stress'], 'moderate'],
  ['Health centre appointment', 'HLT', 'See a doctor about sleep, pain or other health issues.', ['sleep', 'physical health'], 'low'],
  ['Learning accommodations', 'DIS', 'Request exam or classroom accommodations.', ['accessibility', 'neurodiversity'], 'low'],
  ['Settling in for international students', 'INT', 'Visa help, culture shock and feeling at home.', ['homesickness', 'culture'], 'low'],
  ['Placement pressure support', 'CAR', 'Talk through placement anxiety and career choices.', ['career anxiety', 'stress'], 'low'],
  ['Report harassment (confidential)', 'ICC', 'Report harassment or misconduct safely.', ['harassment', 'safety'], 'high'],
  ['Talk to the Dean of Students', 'SWO', 'Anything that does not fit elsewhere.', ['general welfare'], 'low'],
  ['Mindfulness & stress workshop', 'WEL', 'Join a small-group session on managing stress.', ['stress', 'mindfulness'], 'low'],
];

export async function seed() {
  await Promise.all([Department, CatalogItem, User, Ticket, Message, PeerChat, Story, AccessLog].map((M) => M.deleteMany({})));
  const hash = await bcrypt.hash('password123', 10);

  const depts = await Department.insertMany(DEPARTMENTS.map(([name, code, description]) => ({ name, code, description })));
  const D = Object.fromEntries(depts.map((d) => [d.code, d]));
  const items = await CatalogItem.insertMany(CATALOG.map(([name, code, description, expertiseTags, defaultSeverity]) =>
    ({ name, department: D[code]._id, description, expertiseTags, defaultSeverity })));

  const [student] = await User.insertMany([
    { name: 'Aarav Sharma', email: 'student@demo.com', role: 'student', alias: 'Quiet Heron', passwordHash: hash },
    { name: 'Diya Menon', email: 'student2@demo.com', role: 'student', alias: 'Bright Lotus', passwordHash: hash },
    { name: 'Admin', email: 'admin@demo.com', role: 'admin', alias: 'Admin', passwordHash: hash },
  ]);
  const student2 = await User.findOne({ email: 'student2@demo.com' });

  const experts = await User.insertMany([
    { name: 'Dr. Kavya Iyer', email: 'expert@demo.com', role: 'expert', passwordHash: hash, departments: [D.CMH._id],
      expertise: ['anxiety', 'low mood', 'stress', 'crisis support'], bio: 'Clinical psychologist, 9 years with students' },
    { name: 'Prof. Rahul Verma', email: 'expert2@demo.com', role: 'expert', passwordHash: hash, departments: [D.ACA._id, D.CAR._id],
      expertise: ['academic stress', 'study skills', 'career anxiety'], bio: 'Academic advisor and placement mentor' },
    { name: 'Ms. Sneha Pillai', email: 'expert3@demo.com', role: 'expert', passwordHash: hash, departments: [D.ARC._id, D.ICC._id, D.SWO._id],
      expertise: ['ragging', 'harassment', 'safety', 'general welfare'], bio: 'Anti-ragging and ICC coordinator' },
    { name: 'Mr. Arjun Nair', email: 'expert4@demo.com', role: 'expert', passwordHash: hash, departments: [D.HOS._id, D.FIN._id, D.INT._id],
      expertise: ['homesickness', 'conflict resolution', 'financial stress', 'culture'], bio: 'Warden and student support officer' },
  ]);

  const peers = await User.insertMany([
    { name: 'Rohan Gupta', email: 'peer@demo.com', role: 'peer', alias: 'Steady Banyan', passwordHash: hash,
      expertise: ['exam stress', 'backlogs'], bio: 'Final year CSE. Cleared 3 backlogs in 2nd year.' },
    { name: 'Meera Joshi', email: 'peer2@demo.com', role: 'peer', alias: 'Warm Monsoon', passwordHash: hash,
      expertise: ['homesickness', 'first year'], bio: 'Final year ECE. First-gen student from a small town.' },
    { name: 'Kabir Singh', email: 'peer3@demo.com', role: 'peer', alias: 'Brave Kestrel', passwordHash: hash,
      expertise: ['anxiety', 'placements'], bio: 'Alumnus, now an SDE. Dealt with anxiety through placements.' },
  ]);

  await Story.insertMany([
    { author: peers[0]._id, topic: 'exam stress', approved: true, title: 'I had three backlogs and still graduated on time',
      body: 'In second year I stopped going to class and the backlogs piled up. What helped was telling my advisor early instead of hiding it, and planning one subject at a time. It felt impossible, but it was not.' },
    { author: peers[1]._id, topic: 'homesickness', approved: true, title: 'The first semester was the loneliest of my life',
      body: 'I cried almost every night for the first month. I joined one club, just one, and called home on a fixed schedule instead of all day. By October the hostel felt like mine.' },
    { author: peers[2]._id, topic: 'anxiety', approved: true, title: 'Panic attacks during placement season',
      body: 'I thought something was wrong with me. Booking a counselling session was the best decision I made. Breathing exercises and a counsellor who understood placements got me through.' },
    { author: peers[1]._id, topic: 'ragging', approved: true, title: 'Speaking up about ragging was the right call',
      body: 'Seniors made first-years do things at night. I reported it confidentially and the anti-ragging cell handled it without anyone knowing it was me.' },
  ]);

  const item = (code) => items.find((i) => String(i.department) === String(D[code]._id));
  const hoursAgo = (h) => new Date(Date.now() - h * 3600000);
  const mk = (s, code, subject, description, severity, created, extra = {}) => ({
    student: s._id, department: D[code]._id, catalogItem: item(code)._id, expertiseNeeded: item(code).expertiseTags,
    subject, description, severity, createdAt: created, slaDueAt: new Date(created.getTime() + SLA_HOURS[severity] * 3600000),
    aiSummary: `AI estimate: ${severity}. Suggested department: ${code}.`, ...extra,
  });
  await Ticket.insertMany([
    mk(student, 'CMH', 'Cannot focus, feel anxious all the time', 'For the last month I feel anxious before every class and cannot sleep properly. My grades are dropping.', 'moderate', hoursAgo(5)),
    mk(student2, 'ARC', 'Seniors forcing juniors at night', 'Some seniors in our hostel block call first-years at night and make us do things. I am scared to say who.', 'high', hoursAgo(6), { anonymous: true, status: 'escalated' }),
    mk(student, 'ACA', 'Two backlogs and exams in 3 weeks', 'I have two backlogs from last semester and I do not know how to prepare for both along with current exams.', 'low', hoursAgo(20), { consentToShare: true }),
    mk(student2, 'FIN', 'Scholarship not credited, fees due', 'My scholarship has not come yet and the fee deadline is next week. My family cannot pay the full amount.', 'moderate', hoursAgo(2)),
    mk(student2, 'HOS', 'Constant fights with roommate', 'My roommate plays music till 3am and we keep fighting. I dread going back to my room.', 'low', hoursAgo(30)),
  ]);

  const chat = await PeerChat.create({ student: student._id, peer: peers[0]._id, topic: 'exam stress' });
  await Message.insertMany([
    { thread: `peer:${chat._id}`, sender: peers[0]._id, senderLabel: 'Steady Banyan (Peer mentor)', text: 'Hey! I saw you wanted to talk about exam stress. I have been there. What is weighing on you most right now?' },
  ]);
  return { experts: experts.length };
}

// Run directly: `npm run seed` (resets the database)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('Set MONGO_URI in .env to seed a real database.'); process.exit(1); }
  await mongoose.connect(uri);
  await seed();
  console.log('Database seeded. All demo passwords: password123');
  await mongoose.disconnect();
}

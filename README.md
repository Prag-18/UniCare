# CampusCare: student self-service support portal

Track 04, Self-Service Support Portal. Stack: **React (Vite) + Node.js (Express) + MongoDB (Mongoose)**.

> The scenario: mental health referrals are up 40%, support is fragmented across 12 departments, and students wait three weeks for a first appointment. CampusCare gives students one front door to peers, experts and the AI assistant. It gives experts one queue they can filter by department and expertise.

## Run it

You need Node 18 or newer. Open two terminals.

```bash
# terminal 1: API
cd server
cp .env.example .env        # set MONGO_URI, or leave it empty (see below)
npm install
npm run dev                 # http://localhost:5000

# terminal 2: web app
cd client
npm install
npm run dev                 # http://localhost:5173
```

**MongoDB options**
- Local MongoDB or Atlas: put the connection string in `MONGO_URI`. The API seeds demo data automatically if the DB is empty. `npm run seed` resets it.
- No MongoDB installed: leave `MONGO_URI=` empty and the API starts an in-memory MongoDB (`mongodb-memory-server`, downloads a MongoDB binary once) and seeds it. Data resets on restart.

**AI assistant.** Add `ANTHROPIC_API_KEY` to `.env` to use Claude for triage. Without a key, a rule-based triage runs, so the demo works offline. Crisis keywords always override the model's output.

## Demo accounts (password: `password123`)

| Role | Email | Alias / Name | Notes |
|---|---|---|---|
| Student | student@demo.com | Quiet Heron (Aarav Sharma) | Primary demo student with active tickets & peer chat |
| Student | student2@demo.com | Bright Lotus (Diya Menon) | Has anonymous ragging & financial aid reports |
| Expert | expert@demo.com | Dr. Kavya Iyer | Counselling & Mental Health |
| Expert | expert2@demo.com | Prof. Rahul Verma | Academic Affairs, Career & Placement |
| Expert | expert3@demo.com | Ms. Sneha Pillai | Anti-Ragging Cell, ICC, Student Welfare |
| Expert | expert4@demo.com | Mr. Arjun Nair | Hostel, Financial Aid, International |
| Peer mentor | peer@demo.com | Steady Banyan (Rohan Gupta) | Senior who cleared 3 backlogs (Exam stress) |
| Peer mentor | peer2@demo.com | Warm Monsoon (Meera Joshi) | First-gen senior (Homesickness & 1st year) |
| Peer mentor | peer3@demo.com | Brave Kestrel (Kabir Singh) | Alumnus SDE (Placement anxiety) |
| Admin | admin@demo.com | Admin | Adds departments, services, experts, approves stories |

## What's in it

**Common login.** One login page with a role picker: Student, Expert, Peer mentor or Admin. Students can self-register.

**Student dashboard**
1. **Talk to peers** (first option): stories from seniors and alumni, filterable by topic, and one-to-one chat with trained peer mentors. Students appear by alias only.
2. **Talk to an expert:** the student writes their query in their own words, which raises a ticket. Choosing a service is optional; the system routes it if the student isn't sure.
3. **Ask the assistant:** an AI chatbot that estimates severity (low, moderate, high, crisis) and suggests which feature to use, with a recommended service. It guides and never diagnoses.
4. **All services (catalog):** every support service across the 12 departments in one searchable list.
5. **My requests:** live status ("Waiting for an expert", "Expert assigned", "Escalated") and a private conversation once an expert accepts.
6. **Help now:** crisis helplines (Tele-MANAS 14416, UGC Anti-Ragging 1800-180-5522, 112, campus counsellor) visible on every student screen.

**Expert dashboard**
- Queue sorted by severity, then by response deadline.
- **Filters:** department (my departments, all 12, or a single one), expertise (matches mine or a specific tag), severity and status.
- **Accept or decline:** "Yes, I'll take this case" assigns it atomically, so two experts can't take the same case, and sends the student a first message. "Not for me" needs a reason. When every expert in the department has declined, the case escalates.
- Stats: cases waiting, cases past deadline, and average time to first response.

**Mentor's points**
- **Privacy:** anonymous requests, and a consent checkbox before other departments can read a request. Experts outside the owning department see the subject only, and a student's real name appears only after acceptance (never if anonymous). Role-based API checks, chat access limited to participants, an access log of who opened, accepted or declined which ticket, and aliases in peer support.
- **Scaling (new systems):** departments, services and experts are data. The admin console adds a 13th department, a new service or a new expert, and they appear for students and experts instantly with no code change.
- **Catalog:** each service belongs to a department and carries expertise tags and a default severity. Tickets are raised against catalog items, which drives routing and the expertise filter.

**Response deadlines.** Crisis 30 min, high 4 hr, moderate 24 hr, low 72 hr. A background job escalates open tickets that pass their deadline, so no student sits in a queue for three weeks.

## Suggested 3-minute demo

1. Sign in as **student@demo.com**. Show Talk to peers, then open a story and the existing peer chat.
2. In **Ask the assistant**, type "seniors in my hostel are ragging us at night". It returns high priority, helplines and a recommended service (Report ragging). Click through and raise the request anonymously.
3. Sign in as **expert3@demo.com**. Filter by department: Anti-Ragging Cell. Note the anonymous label, then click "Yes, I'll take this case".
4. Back as the student, **My requests** now shows "Expert assigned" and a message from the expert.
5. Sign in as **admin@demo.com** and add a new department (e.g. Library & Learning Support) with a service. Show it appearing in the student catalog. That's the scaling point.

## Project structure

```
server/
  index.js    Express app, all routes, privacy rules, SLA watcher
  models.js   Department, CatalogItem, User, Ticket, Message, PeerChat, Story, AccessLog
  ai.js       Triage assistant (Claude API + rule-based fallback, crisis override)
  seed.js     12 departments, 13 services, demo users, stories, tickets
client/src/
  App.jsx                   Role-based routing after login
  pages/                    Login, StudentHome, ExpertDashboard, PeerHome, AdminConsole
  components/               PeerSupport, ExpertRequest, Assistant, Catalog, MyRequests, Thread, HelpNow
```

MVC mapping: **Models** are in `models.js`. **Controllers** are the route handlers in `index.js` plus `ai.js`. **Views** are the React pages and components.

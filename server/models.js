import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;

// SCALING: departments and catalog services are data, not code.
// Adding a 13th department or a new service = one new document.
const DepartmentSchema = new Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  description: String,
  active: { type: Boolean, default: true },
}, { timestamps: true });

// CATALOG: every support service a student can request.
const CatalogItemSchema = new Schema({
  name: { type: String, required: true },
  department: { type: Types.ObjectId, ref: 'Department', required: true },
  description: String,
  expertiseTags: [String],
  defaultSeverity: { type: String, enum: ['low', 'moderate', 'high'], default: 'moderate' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'expert', 'peer', 'admin'], required: true },
  alias: String,                                              // PRIVACY: shown instead of real name
  departments: [{ type: Types.ObjectId, ref: 'Department' }], // experts
  expertise: [String],                                        // experts + peer mentors
  bio: String,
}, { timestamps: true });

const TicketSchema = new Schema({
  student: { type: Types.ObjectId, ref: 'User', required: true },
  anonymous: { type: Boolean, default: false },
  consentToShare: { type: Boolean, default: false },  // share details across departments
  catalogItem: { type: Types.ObjectId, ref: 'CatalogItem' },
  department: { type: Types.ObjectId, ref: 'Department', required: true },
  expertiseNeeded: [String],
  subject: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, enum: ['low', 'moderate', 'high', 'crisis'], default: 'moderate' },
  aiSummary: String,
  status: { type: String, enum: ['open', 'accepted', 'resolved', 'escalated'], default: 'open' },
  assignedExpert: { type: Types.ObjectId, ref: 'User' },
  declinedBy: [{ expert: { type: Types.ObjectId, ref: 'User' }, reason: String, at: Date }],
  slaDueAt: Date,
  acceptedAt: Date,
  resolvedAt: Date,
}, { timestamps: true });

// Messages for both expert tickets ("ticket:<id>") and peer chats ("peer:<id>")
const MessageSchema = new Schema({
  thread: { type: String, required: true, index: true },
  sender: { type: Types.ObjectId, ref: 'User', required: true },
  senderLabel: String,
  text: { type: String, required: true, maxlength: 4000 },
}, { timestamps: true });

const PeerChatSchema = new Schema({
  student: { type: Types.ObjectId, ref: 'User', required: true },
  peer: { type: Types.ObjectId, ref: 'User', required: true },
  topic: String,
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
}, { timestamps: true });

// Seniors' lived-experience stories (moderated before publishing)
const StorySchema = new Schema({
  author: { type: Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  topic: String,
  body: { type: String, required: true },
  approved: { type: Boolean, default: false },
}, { timestamps: true });

// PRIVACY: who opened which ticket, and when
const AccessLogSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'User' },
  ticket: { type: Types.ObjectId, ref: 'Ticket' },
  action: String,
}, { timestamps: true });

export const Department = model('Department', DepartmentSchema);
export const CatalogItem = model('CatalogItem', CatalogItemSchema);
export const User = model('User', UserSchema);
export const Ticket = model('Ticket', TicketSchema);
export const Message = model('Message', MessageSchema);
export const PeerChat = model('PeerChat', PeerChatSchema);
export const Story = model('Story', StorySchema);
export const AccessLog = model('AccessLog', AccessLogSchema);

export const SLA_HOURS = { crisis: 0.5, high: 4, moderate: 24, low: 72 };

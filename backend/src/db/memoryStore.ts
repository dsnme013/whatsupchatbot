import { DEFAULT_PROFILE } from "./mappers.js";
import type {
  Booking,
  DashboardPatient,
  DashboardProfile,
  DashboardScheduleSlot,
  DashboardThread,
  SessionState
} from "../store.js";

const sessions = new Map<string, SessionState>();
const bookings = new Map<string, Booking>();
const dashboardPatients = new Map<number, DashboardPatient>();
const patientToBookingId = new Map<number, string>();
const bookingToPatientId = new Map<string, number>();
const dashboardThreads = new Map<number, DashboardThread>();

let profile: DashboardProfile = { ...DEFAULT_PROFILE };
let available = false;
let schedule: DashboardScheduleSlot[] = [];
let openSlots: string[] = [];
let nextPatientId = 1;

export async function seedMemoryStore(): Promise<void> {
  profile = { ...DEFAULT_PROFILE };
  available = false;
  schedule = [];
  openSlots = [];
}

export async function createSession(sessionId: string): Promise<SessionState> {
  const session: SessionState = { sessionId, createdAtIso: new Date().toISOString() };
  sessions.set(sessionId, session);
  return session;
}

export async function getSession(sessionId: string): Promise<SessionState | null> {
  return sessions.get(sessionId) ?? null;
}

export async function saveSession(session: SessionState): Promise<SessionState> {
  sessions.set(session.sessionId, session);
  return session;
}

export async function getBooking(id: string): Promise<Booking | null> {
  return bookings.get(id) ?? null;
}

export async function listBookings(): Promise<Booking[]> {
  return [...bookings.values()].sort(
    (a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime()
  );
}

export async function saveBooking(booking: Booking): Promise<Booking> {
  bookings.set(booking.id, booking);
  return booking;
}

export async function getDashboardPatient(id: number): Promise<DashboardPatient | null> {
  return dashboardPatients.get(id) ?? null;
}

export async function listDashboardPatients(): Promise<DashboardPatient[]> {
  return [...dashboardPatients.values()].sort((a, b) => a.id - b.id);
}

export async function getPatientIdForBooking(bookingId: string): Promise<number | null> {
  return bookingToPatientId.get(bookingId) ?? null;
}

export async function getBookingIdForPatient(patientId: number): Promise<string | null> {
  return patientToBookingId.get(patientId) ?? null;
}

export async function upsertDashboardPatient(
  bookingId: string,
  patient: DashboardPatient
): Promise<DashboardPatient> {
  let id = patient.id;
  if (!id || !dashboardPatients.has(id)) {
    const existing = bookingToPatientId.get(bookingId);
    id = existing ?? nextPatientId++;
  }
  const saved = { ...patient, id };
  dashboardPatients.set(id, saved);
  bookingToPatientId.set(bookingId, id);
  patientToBookingId.set(id, bookingId);
  return saved;
}

export async function updateDashboardPatientStatus(
  patientId: number,
  status: DashboardPatient["status"]
): Promise<void> {
  const p = dashboardPatients.get(patientId);
  if (p) dashboardPatients.set(patientId, { ...p, status });
}

export async function getThread(patientId: number): Promise<DashboardThread | null> {
  return dashboardThreads.get(patientId) ?? null;
}

export async function listThreadSummaries() {
  const out = [];
  for (const [pid, th] of dashboardThreads) {
    const p = dashboardPatients.get(pid);
    if (!p) continue;
    out.push({
      patient_id: pid,
      name: p.name,
      color: p.color,
      unread: th.unread,
      last: th.msgs.length ? th.msgs[th.msgs.length - 1] : null
    });
  }
  return out;
}

export async function ensureThread(patientId: number): Promise<DashboardThread> {
  let th = dashboardThreads.get(patientId);
  if (!th) {
    th = { patient_id: patientId, unread: false, msgs: [] };
    dashboardThreads.set(patientId, th);
  }
  return th;
}

export async function appendThreadMessage(
  patientId: number,
  msg: { who: "me" | "them"; t: string; txt: string },
  opts?: { unread?: boolean }
): Promise<DashboardThread> {
  const th = await ensureThread(patientId);
  th.msgs.push(msg);
  if (opts?.unread != null) th.unread = opts.unread;
  dashboardThreads.set(patientId, th);
  return th;
}

export async function markThreadRead(patientId: number): Promise<DashboardThread> {
  const th = await ensureThread(patientId);
  th.unread = false;
  dashboardThreads.set(patientId, th);
  return th;
}

export async function countUnreadThreads(): Promise<number> {
  return [...dashboardThreads.values()].filter((t) => t.unread).length;
}

export async function getDashboardProfile(): Promise<DashboardProfile> {
  return { ...profile };
}

export async function updateDashboardProfile(patch: Partial<DashboardProfile>): Promise<DashboardProfile> {
  profile = { ...profile, ...patch };
  return { ...profile };
}

export async function getDashboardRuntime(): Promise<{
  available: boolean;
  schedule: DashboardScheduleSlot[];
  openSlots: string[];
}> {
  return { available, schedule: [...schedule], openSlots: [...openSlots] };
}

export async function saveDashboardRuntime(data: {
  available?: boolean;
  schedule?: DashboardScheduleSlot[];
  openSlots?: string[];
}): Promise<void> {
  if (data.available != null) available = data.available;
  if (data.schedule != null) schedule = data.schedule;
  if (data.openSlots != null) openSlots = data.openSlots;
}

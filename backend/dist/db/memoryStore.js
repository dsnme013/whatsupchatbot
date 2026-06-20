import { DEFAULT_PROFILE } from "./mappers.js";
const sessions = new Map();
const bookings = new Map();
const dashboardPatients = new Map();
const patientToBookingId = new Map();
const bookingToPatientId = new Map();
const dashboardThreads = new Map();
let profile = { ...DEFAULT_PROFILE };
let available = false;
let schedule = [];
let openSlots = [];
let nextPatientId = 1;
export async function seedMemoryStore() {
    profile = { ...DEFAULT_PROFILE };
    available = false;
    schedule = [];
    openSlots = [];
}
export async function createSession(sessionId) {
    const session = { sessionId, createdAtIso: new Date().toISOString() };
    sessions.set(sessionId, session);
    return session;
}
export async function getSession(sessionId) {
    return sessions.get(sessionId) ?? null;
}
export async function saveSession(session) {
    sessions.set(session.sessionId, session);
    return session;
}
export async function getBooking(id) {
    return bookings.get(id) ?? null;
}
export async function listBookings() {
    return [...bookings.values()].sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime());
}
export async function saveBooking(booking) {
    bookings.set(booking.id, booking);
    return booking;
}
export async function getDashboardPatient(id) {
    return dashboardPatients.get(id) ?? null;
}
export async function listDashboardPatients() {
    return [...dashboardPatients.values()].sort((a, b) => a.id - b.id);
}
export async function getPatientIdForBooking(bookingId) {
    return bookingToPatientId.get(bookingId) ?? null;
}
export async function getBookingIdForPatient(patientId) {
    return patientToBookingId.get(patientId) ?? null;
}
export async function upsertDashboardPatient(bookingId, patient) {
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
export async function updateDashboardPatientStatus(patientId, status) {
    const p = dashboardPatients.get(patientId);
    if (p)
        dashboardPatients.set(patientId, { ...p, status });
}
export async function getThread(patientId) {
    return dashboardThreads.get(patientId) ?? null;
}
export async function listThreadSummaries() {
    const out = [];
    for (const [pid, th] of dashboardThreads) {
        const p = dashboardPatients.get(pid);
        if (!p)
            continue;
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
export async function ensureThread(patientId) {
    let th = dashboardThreads.get(patientId);
    if (!th) {
        th = { patient_id: patientId, unread: false, msgs: [] };
        dashboardThreads.set(patientId, th);
    }
    return th;
}
export async function appendThreadMessage(patientId, msg, opts) {
    const th = await ensureThread(patientId);
    th.msgs.push(msg);
    if (opts?.unread != null)
        th.unread = opts.unread;
    dashboardThreads.set(patientId, th);
    return th;
}
export async function markThreadRead(patientId) {
    const th = await ensureThread(patientId);
    th.unread = false;
    dashboardThreads.set(patientId, th);
    return th;
}
export async function countUnreadThreads() {
    return [...dashboardThreads.values()].filter((t) => t.unread).length;
}
export async function getDashboardProfile() {
    return { ...profile };
}
export async function updateDashboardProfile(patch) {
    profile = { ...profile, ...patch };
    return { ...profile };
}
export async function getDashboardRuntime() {
    return { available, schedule: [...schedule], openSlots: [...openSlots] };
}
export async function saveDashboardRuntime(data) {
    if (data.available != null)
        available = data.available;
    if (data.schedule != null)
        schedule = data.schedule;
    if (data.openSlots != null)
        openSlots = data.openSlots;
}

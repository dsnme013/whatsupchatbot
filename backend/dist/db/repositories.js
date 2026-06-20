import { isMemoryStorage } from "./connectionState.js";
import { prisma } from "./client.js";
import * as memory from "./memoryStore.js";
import { bookingToRowData, DEFAULT_PROFILE, parseOpenSlotsJson, parseScheduleJson, profileToRowData, rowToBooking, rowToDashboardPatient, rowToProfile, rowToSession, rowToThread } from "./mappers.js";
/* ------------------------------ sessions ------------------------------ */
export async function createSession(sessionId) {
    if (isMemoryStorage())
        return memory.createSession(sessionId);
    const row = await prisma.session.create({
        data: { sessionId }
    });
    return rowToSession(row);
}
export async function getSession(sessionId) {
    if (isMemoryStorage())
        return memory.getSession(sessionId);
    const row = await prisma.session.findUnique({ where: { sessionId } });
    return row ? rowToSession(row) : null;
}
export async function saveSession(session) {
    if (isMemoryStorage())
        return memory.saveSession(session);
    const row = await prisma.session.upsert({
        where: { sessionId: session.sessionId },
        create: {
            sessionId: session.sessionId,
            createdAt: new Date(session.createdAtIso),
            consentToCollectHealthInfo: session.consentToCollectHealthInfo ?? null,
            triageInput: session.triageInput ?? undefined,
            triage: session.triage ?? undefined,
            history: session.history ?? undefined
        },
        update: {
            consentToCollectHealthInfo: session.consentToCollectHealthInfo ?? null,
            triageInput: session.triageInput ?? undefined,
            triage: session.triage ?? undefined,
            history: session.history ?? undefined
        }
    });
    return rowToSession(row);
}
/* ------------------------------ bookings ------------------------------ */
export async function getBooking(id) {
    if (isMemoryStorage())
        return memory.getBooking(id);
    const row = await prisma.booking.findUnique({ where: { id } });
    return row ? rowToBooking(row) : null;
}
export async function listBookings() {
    if (isMemoryStorage())
        return memory.listBookings();
    const rows = await prisma.booking.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(rowToBooking);
}
export async function saveBooking(booking) {
    if (isMemoryStorage())
        return memory.saveBooking(booking);
    const data = bookingToRowData(booking);
    const row = await prisma.booking.upsert({
        where: { id: booking.id },
        create: {
            id: booking.id,
            createdAt: new Date(booking.createdAtIso),
            ...data
        },
        update: data
    });
    return rowToBooking(row);
}
/* --------------------------- dashboard patients --------------------------- */
export async function getDashboardPatient(id) {
    if (isMemoryStorage())
        return memory.getDashboardPatient(id);
    const row = await prisma.dashboardPatient.findUnique({ where: { id } });
    return row ? rowToDashboardPatient(row) : null;
}
export async function listDashboardPatients() {
    if (isMemoryStorage())
        return memory.listDashboardPatients();
    const rows = await prisma.dashboardPatient.findMany({ orderBy: { id: "asc" } });
    return rows.map(rowToDashboardPatient);
}
export async function getPatientIdForBooking(bookingId) {
    if (isMemoryStorage())
        return memory.getPatientIdForBooking(bookingId);
    const row = await prisma.dashboardPatient.findUnique({
        where: { bookingId },
        select: { id: true }
    });
    return row?.id ?? null;
}
export async function getBookingIdForPatient(patientId) {
    if (isMemoryStorage())
        return memory.getBookingIdForPatient(patientId);
    const row = await prisma.dashboardPatient.findUnique({
        where: { id: patientId },
        select: { bookingId: true }
    });
    return row?.bookingId ?? null;
}
export async function upsertDashboardPatient(bookingId, patient) {
    if (isMemoryStorage())
        return memory.upsertDashboardPatient(bookingId, patient);
    const data = {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        symptom: patient.symptom,
        onset: patient.onset,
        score: patient.score,
        tier: patient.tier,
        flags: patient.flags,
        comorb: patient.comorb,
        mode: patient.mode,
        time: patient.time,
        color: patient.color,
        status: patient.status,
        fee: patient.fee
    };
    const row = await prisma.dashboardPatient.upsert({
        where: { bookingId },
        create: { bookingId, ...data },
        update: data
    });
    return rowToDashboardPatient(row);
}
export async function updateDashboardPatientStatus(patientId, status) {
    if (isMemoryStorage())
        return memory.updateDashboardPatientStatus(patientId, status);
    await prisma.dashboardPatient.update({
        where: { id: patientId },
        data: { status }
    });
}
/* ------------------------------ threads ------------------------------ */
export async function getThread(patientId) {
    if (isMemoryStorage())
        return memory.getThread(patientId);
    const row = await prisma.dashboardThread.findUnique({
        where: { patientId },
        include: { messages: { orderBy: { sortOrder: "asc" } } }
    });
    return row ? rowToThread(row) : null;
}
export async function listThreadSummaries() {
    if (isMemoryStorage())
        return memory.listThreadSummaries();
    const threads = await prisma.dashboardThread.findMany({
        include: {
            patient: true,
            messages: { orderBy: { sortOrder: "desc" }, take: 1 }
        }
    });
    return threads.map((th) => ({
        patient_id: th.patientId,
        name: th.patient.name,
        color: th.patient.color,
        unread: th.unread,
        last: th.messages[0]
            ? { who: th.messages[0].who, t: th.messages[0].t, txt: th.messages[0].txt }
            : null
    }));
}
export async function ensureThread(patientId) {
    if (isMemoryStorage())
        return memory.ensureThread(patientId);
    let row = await prisma.dashboardThread.findUnique({
        where: { patientId },
        include: { messages: { orderBy: { sortOrder: "asc" } } }
    });
    if (!row) {
        row = await prisma.dashboardThread.create({
            data: { patientId },
            include: { messages: { orderBy: { sortOrder: "asc" } } }
        });
    }
    return rowToThread(row);
}
export async function appendThreadMessage(patientId, msg, opts) {
    if (isMemoryStorage())
        return memory.appendThreadMessage(patientId, msg, opts);
    const thread = await ensureThread(patientId);
    const row = await prisma.dashboardThread.findUniqueOrThrow({
        where: { patientId },
        include: { messages: true }
    });
    const sortOrder = row.messages.length;
    await prisma.dashboardMessage.create({
        data: {
            threadId: row.id,
            who: msg.who,
            t: msg.t,
            txt: msg.txt,
            sortOrder
        }
    });
    if (opts?.unread != null) {
        await prisma.dashboardThread.update({
            where: { patientId },
            data: { unread: opts.unread }
        });
    }
    return (await getThread(patientId));
}
export async function markThreadRead(patientId) {
    if (isMemoryStorage())
        return memory.markThreadRead(patientId);
    await prisma.dashboardThread.update({
        where: { patientId },
        data: { unread: false }
    });
    return (await getThread(patientId));
}
export async function countUnreadThreads() {
    if (isMemoryStorage())
        return memory.countUnreadThreads();
    return prisma.dashboardThread.count({ where: { unread: true } });
}
/* ------------------------------ profile / runtime ------------------------------ */
export async function getDashboardProfile() {
    if (isMemoryStorage())
        return memory.getDashboardProfile();
    const row = await prisma.dashboardProfile.findUnique({ where: { id: 1 } });
    return row ? rowToProfile(row) : DEFAULT_PROFILE;
}
export async function updateDashboardProfile(patch) {
    if (isMemoryStorage())
        return memory.updateDashboardProfile(patch);
    const row = await prisma.dashboardProfile.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            name: patch.name ?? DEFAULT_PROFILE.name,
            speciality: patch.speciality ?? DEFAULT_PROFILE.speciality,
            fee: patch.fee ?? DEFAULT_PROFILE.fee,
            homeFee: patch.home_fee ?? DEFAULT_PROFILE.home_fee,
            languages: patch.languages ?? DEFAULT_PROFILE.languages,
            bio: patch.bio ?? DEFAULT_PROFILE.bio,
            acceptVideo: patch.accept_video ?? DEFAULT_PROFILE.accept_video,
            acceptHomeVisits: patch.accept_home_visits ?? DEFAULT_PROFILE.accept_home_visits,
            autoAcceptLow: patch.auto_accept_low ?? DEFAULT_PROFILE.auto_accept_low,
            whatsappNotifications: patch.whatsapp_notifications ?? DEFAULT_PROFILE.whatsapp_notifications
        },
        update: profileToRowData(patch)
    });
    return rowToProfile(row);
}
export async function getDashboardRuntime() {
    if (isMemoryStorage())
        return memory.getDashboardRuntime();
    const row = await prisma.dashboardRuntime.findUnique({ where: { id: 1 } });
    if (!row) {
        return { available: false, schedule: [], openSlots: [] };
    }
    return {
        available: row.available,
        schedule: parseScheduleJson(row.scheduleJson),
        openSlots: parseOpenSlotsJson(row.openSlotsJson)
    };
}
export async function saveDashboardRuntime(data) {
    if (isMemoryStorage())
        return memory.saveDashboardRuntime(data);
    const current = await getDashboardRuntime();
    await prisma.dashboardRuntime.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            available: data.available ?? false,
            scheduleJson: data.schedule ?? [],
            openSlotsJson: data.openSlots ?? []
        },
        update: {
            ...(data.available != null ? { available: data.available } : {}),
            ...(data.schedule != null ? { scheduleJson: data.schedule } : {}),
            ...(data.openSlots != null ? { openSlotsJson: data.openSlots } : {})
        }
    });
    void current;
}
export async function seedDatabase() {
    if (isMemoryStorage())
        return memory.seedMemoryStore();
    await prisma.dashboardProfile.upsert({
        where: { id: 1 },
        create: {
            id: 1,
            name: DEFAULT_PROFILE.name,
            speciality: DEFAULT_PROFILE.speciality,
            fee: DEFAULT_PROFILE.fee,
            homeFee: DEFAULT_PROFILE.home_fee,
            languages: DEFAULT_PROFILE.languages,
            bio: DEFAULT_PROFILE.bio,
            acceptVideo: DEFAULT_PROFILE.accept_video,
            acceptHomeVisits: DEFAULT_PROFILE.accept_home_visits,
            autoAcceptLow: DEFAULT_PROFILE.auto_accept_low,
            whatsappNotifications: DEFAULT_PROFILE.whatsapp_notifications
        },
        update: {}
    });
    await prisma.dashboardRuntime.upsert({
        where: { id: 1 },
        create: { id: 1, available: false, scheduleJson: [], openSlotsJson: [] },
        update: {}
    });
}

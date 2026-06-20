import { doctors } from "./data/doctors.js";
import { RescheduleBookingSchema } from "./schemas.js";
import { applyLivePrices, CONSOLE_DOCTOR_ID, resolveConsultationFee } from "./lib/fees.js";
import * as repo from "./db/repositories.js";
import { getDashboardProfileSync, saveProfileState } from "./db/profileState.js";
import { getAvailable, getOpenSlots, getSchedule, persistRuntimeState, replaceOpenSlots, replaceSchedule, setAvailable, setOpenSlots, setSchedule } from "./db/runtimeState.js";
/**
 * Doctor Console API — compatible with
 * https://github.com/ankanisairam07166-glitch/doctor_dashboard
 *
 * Patient chat bookings persist in PostgreSQL and sync to the live queue.
 */
const COLORS = ["#0f766e", "#b45309", "#7c3aed", "#0369a1", "#be185d", "#15803d"];
const colorFor = (id) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const fmtSlotKey = (iso) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const h12 = h % 12 || 12;
    const ampm = h < 12 ? "AM" : "PM";
    return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};
const normalizeSlotLabel = (label) => label.trim().replace(/\s+/g, " ").toUpperCase();
const dashboardModeToBooking = (mode) => mode === "Video" ? "video" : "home";
/** Resolve a dashboard slot label (e.g. "7:00 PM") to ISO + mode — including ad-hoc open slots. */
function resolveSlotFromLabel(slotLabel, doc, opts) {
    const norm = normalizeSlotLabel(slotLabel);
    for (const s of doc.nextSlots) {
        if (normalizeSlotLabel(fmtSlotKey(s.atIso)) === norm) {
            return { atIso: s.atIso, mode: s.mode };
        }
    }
    const m = slotLabel.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    const ref = opts.referenceIso ? new Date(opts.referenceIso) : new Date();
    if (m) {
        let h = parseInt(m[1], 10);
        const min = m[2] ? parseInt(m[2], 10) : 0;
        const ampm = m[3].toUpperCase();
        if (ampm === "PM" && h !== 12)
            h += 12;
        if (ampm === "AM" && h === 12)
            h = 0;
        const d = new Date(ref);
        d.setHours(h, min, 0, 0);
        return { atIso: d.toISOString(), mode: opts.preferredMode };
    }
    return { atIso: ref.toISOString(), mode: opts.preferredMode };
}
const onsetLabel = (onset) => {
    switch (onset) {
        case "today":
            return "Today";
        case "yesterday":
            return "Yesterday";
        case "2-3days":
            return "2–3 days";
        case "1week+":
            return "1 week+";
        default:
            return "Unknown";
    }
};
const redFlagLabels = (input) => {
    if (!input?.redFlags)
        return [];
    const f = input.redFlags;
    const out = [];
    if (f.chestPain)
        out.push("Chest pain");
    if (f.breathingTrouble)
        out.push("Breathing trouble");
    if (f.fainting)
        out.push("Fainting");
    if (f.confusion)
        out.push("Confusion");
    if (f.severeWeakness)
        out.push("Severe weakness");
    if (f.stiffNeck)
        out.push("Stiff neck");
    if (f.severeDehydration)
        out.push("Dehydration");
    if (f.spo2Below92)
        out.push("Low SpO2");
    return out;
};
function dashboardGender(gender) {
    if (gender === "male")
        return "M";
    if (gender === "female")
        return "F";
    return "O";
}
function bookingFeeInr(booking) {
    return resolveConsultationFee(booking.doctorId, booking.mode);
}
/** Re-apply live dashboard fees to every booking + queue row after Settings change. */
async function refreshAllBookingFees() {
    const all = await repo.listBookings();
    for (const booking of all) {
        const updated = {
            ...booking,
            feeInr: resolveConsultationFee(booking.doctorId, booking.mode)
        };
        await repo.saveBooking(updated);
        const pid = await repo.getPatientIdForBooking(booking.id);
        if (pid != null)
            await upsertDashboardFromBooking(updated);
    }
}
async function totalEarningsInr() {
    const patients = await repo.listDashboardPatients();
    return patients.reduce((sum, p) => sum + p.fee, 0);
}
async function bookingToPatient(booking, patientId) {
    const session = await repo.getSession(booking.sessionId);
    const t = session?.triage;
    const input = session?.triageInput;
    return {
        id: patientId,
        name: booking.patient.name || "Patient",
        age: booking.patient.age ?? input?.age ?? 45,
        gender: dashboardGender(booking.patient.gender),
        symptom: input?.mainSymptom ?? t?.summaryForDoctor.oneLiner ?? "Symptoms not recorded",
        onset: onsetLabel(input?.onset),
        score: t?.score0to100 ?? 0,
        tier: t?.severity ?? "low",
        flags: redFlagLabels(input),
        comorb: session?.history?.conditions ?? input?.comorbidities ?? [],
        mode: booking.mode === "video" ? "Video" : "Home visit",
        time: fmtTime(booking.slotAtIso),
        color: colorFor(booking.id),
        status: booking.status ?? "pending",
        fee: bookingFeeInr(booking)
    };
}
async function refreshScheduleFromBookings() {
    const slots = [];
    const open = [];
    const now = Date.now();
    let nearestIdx = -1;
    let nearestDelta = Infinity;
    const allBookings = await repo.listBookings();
    for (const doc of doctors) {
        for (const s of doc.nextSlots) {
            const label = fmtSlotKey(s.atIso);
            const shortT = label.replace(/ (AM|PM)$/, "");
            const booked = allBookings.find((b) => b.doctorId === doc.id && b.slotAtIso === s.atIso);
            const pid = booked ? await repo.getPatientIdForBooking(booked.id) : null;
            const slotMs = new Date(s.atIso).getTime();
            const delta = Math.abs(slotMs - now);
            if (delta < nearestDelta && slotMs >= now - 30 * 60_000) {
                nearestDelta = delta;
                nearestIdx = slots.length;
            }
            slots.push({
                t: shortT,
                pid,
                open: pid == null,
                now: false
            });
            if (pid == null)
                open.push(label);
        }
    }
    if (nearestIdx >= 0)
        slots[nearestIdx] = { ...slots[nearestIdx], now: true };
    setSchedule(slots);
    setOpenSlots(open);
    await persistRuntimeState();
}
/** Create or update doctor-queue row from a patient booking. */
export async function upsertDashboardFromBooking(booking) {
    const existingPid = await repo.getPatientIdForBooking(booking.id);
    const patientId = existingPid ?? 0;
    const patient = await bookingToPatient(booking, patientId || 0);
    const saved = await repo.upsertDashboardPatient(booking.id, patient);
    await refreshScheduleFromBookings();
    const session = await repo.getSession(booking.sessionId);
    const triage = session?.triage;
    const symptomNote = triage?.summaryForDoctor.oneLiner ??
        session?.triageInput?.symptomText ??
        session?.triageInput?.mainSymptom;
    const thread = await repo.getThread(saved.id);
    if (symptomNote && !thread) {
        await repo.appendThreadMessage(saved.id, {
            who: "them",
            t: fmtTime(booking.createdAtIso),
            txt: `New booking via CareConnect chat: ${symptomNote}`
        }, { unread: true });
    }
    return saved.id;
}
/** @deprecated use upsertDashboardFromBooking */
export const syncBookingToDashboard = upsertDashboardFromBooking;
async function patientOr404(pid) {
    const p = await repo.getDashboardPatient(pid);
    if (!p)
        throw Object.assign(new Error("patient_not_found"), { status: 404 });
    return p;
}
function formatPatientAddress(patient) {
    if (patient.address?.trim())
        return patient.address.trim();
    const parts = [patient.house_number, patient.village, patient.city].filter(Boolean);
    if (!parts.length && !patient.pincode)
        return undefined;
    const line = parts.join(", ");
    return patient.pincode ? `${line} - ${patient.pincode}` : line;
}
function buildApprovalMessage(booking, doctorName, timeLabel) {
    const mode = booking.mode === "video" ? "Video consult" : "Home visit";
    const ref = `CC-${booking.id.toUpperCase()}`;
    const fee = bookingFeeInr(booking);
    return `✅ Your appointment is approved! ${doctorName} confirmed your ${mode} on ${timeLabel}. Ref ${ref}. Fee ₹${fee}. We'll remind you before your visit.`;
}
function buildRescheduleMessage(booking, doctorName, whenLabel) {
    const mode = booking.mode === "video" ? "Video consult" : "Home visit";
    const ref = `CC-${booking.id.toUpperCase()}`;
    const fee = bookingFeeInr(booking);
    return `📅 Your doctor rescheduled your appointment. ${doctorName} • ${mode} • ${whenLabel} • Ref ${ref} • Fee ₹${fee}.`;
}
function formatBookingWhen(iso) {
    return new Date(iso).toLocaleString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}
async function notifyPatientApproval(pid, patient) {
    const bookingId = await repo.getBookingIdForPatient(pid);
    if (!bookingId)
        return;
    const booking = await repo.getBooking(bookingId);
    if (!booking)
        return;
    const doc = doctors.find((d) => d.id === booking.doctorId);
    const doctorName = doc?.name ?? getDashboardProfileSync().name;
    const approvalMessage = buildApprovalMessage(booking, doctorName, patient.time);
    const acceptedAtIso = new Date().toISOString();
    await repo.saveBooking({
        ...booking,
        status: "accepted",
        acceptedAtIso,
        approvalMessage,
        feeInr: resolveConsultationFee(booking.doctorId, booking.mode)
    });
    await repo.appendThreadMessage(pid, { who: "me", t: "Just now", txt: approvalMessage });
}
async function updateBookingFromPatient(patient) {
    const bookingId = await repo.getBookingIdForPatient(patient.id);
    if (!bookingId)
        return;
    const booking = await repo.getBooking(bookingId);
    if (!booking)
        return;
    await repo.saveBooking({ ...booking, status: patient.status });
}
async function notifyPatientReschedule(pid, _patient, booking) {
    const doc = doctors.find((d) => d.id === booking.doctorId);
    const doctorName = doc?.name ?? getDashboardProfileSync().name;
    const whenLabel = formatBookingWhen(booking.slotAtIso);
    const rescheduleMessage = buildRescheduleMessage(booking, doctorName, whenLabel);
    const rescheduledAtIso = new Date().toISOString();
    await repo.saveBooking({
        ...booking,
        rescheduleMessage,
        rescheduledAtIso
    });
    await repo.appendThreadMessage(pid, { who: "me", t: "Just now", txt: rescheduleMessage });
}
export async function registerDoctorRoutes(app) {
    // --- doctor_dashboard-compatible routes (/api/v1/*) ---
    const consoleDoc = doctors.find((d) => d.id === CONSOLE_DOCTOR_ID);
    if (consoleDoc) {
        consoleDoc.price.video = resolveConsultationFee(CONSOLE_DOCTOR_ID, "video");
        consoleDoc.price.home = resolveConsultationFee(CONSOLE_DOCTOR_ID, "home");
    }
    app.get("/api/v1/queue", async (req) => {
        const { tier } = req.query;
        let items = await repo.listDashboardPatients();
        items = items.sort((a, b) => b.score - a.score);
        if (tier)
            items = items.filter((p) => p.tier === tier);
        return items;
    });
    app.get("/api/v1/stats", async () => {
        const patients = await repo.listDashboardPatients();
        const pending = patients.filter((p) => p.status === "pending");
        const doc = doctors[0];
        return {
            booked_today: patients.length,
            video: patients.filter((p) => p.mode === "Video").length,
            home_visits: patients.filter((p) => p.mode === "Home visit").length,
            high_triage_pending: pending.filter((p) => p.tier === "high").length,
            pending: pending.length,
            avg_response_min: doc?.responseTimeMinsP50 ?? 11,
            rating: doc?.rating ?? 4.8,
            reviews: doc?.reviewCount ?? 214,
            available: getAvailable(),
            unread_messages: await repo.countUnreadThreads(),
            earnings_today: await totalEarningsInr()
        };
    });
    app.post("/api/v1/booking/:id/accept", async (req, reply) => {
        const pid = Number(req.params.id);
        if (!Number.isFinite(pid))
            return reply.code(400).send({ detail: "invalid_id" });
        let p;
        try {
            p = await patientOr404(pid);
        }
        catch {
            return reply.code(404).send({ detail: "patient_not_found" });
        }
        if (p.status === "accepted")
            return reply.code(409).send({ detail: "already_accepted" });
        p = { ...p, status: "accepted" };
        const bookingId = await repo.getBookingIdForPatient(pid);
        if (bookingId) {
            await repo.upsertDashboardPatient(bookingId, p);
        }
        await notifyPatientApproval(pid, p);
        return p;
    });
    app.patch("/api/v1/booking/:id/reschedule", async (req, reply) => {
        const id = req.params.id;
        const body = req.body;
        // Doctor dashboard: numeric patient id + { slot: "1:00 PM" }
        if (/^\d+$/.test(id)) {
            const pid = Number(id);
            const { slot } = body;
            if (!slot?.trim())
                return reply.code(400).send({ detail: "slot_required" });
            let p;
            try {
                p = await patientOr404(pid);
            }
            catch {
                return reply.code(404).send({ detail: "patient_not_found" });
            }
            const openSlots = getOpenSlots();
            if (!openSlots.includes(slot))
                return reply.code(409).send({ detail: "slot_not_available" });
            const oldTime = p.time;
            p = { ...p, time: slot, status: "rescheduled" };
            const bookingId = await repo.getBookingIdForPatient(pid);
            if (bookingId)
                await repo.upsertDashboardPatient(bookingId, p);
            await updateBookingFromPatient(p);
            if (bookingId) {
                const booking = await repo.getBooking(bookingId);
                if (booking) {
                    const doc = doctors.find((d) => d.id === booking.doctorId);
                    if (doc) {
                        const preferredMode = dashboardModeToBooking(p.mode);
                        const resolved = resolveSlotFromLabel(slot, doc, {
                            referenceIso: booking.slotAtIso,
                            preferredMode
                        });
                        const updated = {
                            ...booking,
                            slotAtIso: resolved.atIso,
                            mode: resolved.mode,
                            status: "rescheduled",
                            feeInr: resolveConsultationFee(booking.doctorId, resolved.mode)
                        };
                        await repo.saveBooking(updated);
                        await notifyPatientReschedule(pid, p, updated);
                    }
                }
            }
            replaceSchedule((schedule) => {
                for (const s of schedule) {
                    if (s.pid === pid) {
                        s.pid = null;
                        s.open = true;
                        s.now = false;
                    }
                }
                for (const s of schedule) {
                    if (s.open && slot.startsWith(s.t)) {
                        s.open = false;
                        s.pid = pid;
                        break;
                    }
                }
                return schedule;
            });
            replaceOpenSlots((slots) => {
                const next = slots.filter((s) => s !== slot);
                if (!next.includes(oldTime))
                    next.push(oldTime);
                return next;
            });
            await persistRuntimeState();
            return p;
        }
        // Patient chat: booking id + { slotAtIso, mode }
        const booking = await repo.getBooking(id);
        if (!booking) {
            return reply.code(404).send({
                error: "booking_not_found",
                message: "Booking not found. The server may have restarted."
            });
        }
        const parsed = RescheduleBookingSchema.safeParse(body);
        if (!parsed.success)
            return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        const doc = doctors.find((d) => d.id === booking.doctorId);
        if (!doc)
            return reply.code(404).send({ error: "doctor_not_found" });
        let slotMatch = doc.nextSlots.find((sl) => sl.atIso === parsed.data.slotAtIso && sl.mode === parsed.data.mode);
        if (!slotMatch)
            slotMatch = doc.nextSlots.find((sl) => sl.mode === parsed.data.mode);
        if (!slotMatch)
            slotMatch = doc.nextSlots.find((sl) => sl.atIso === parsed.data.slotAtIso);
        if (!slotMatch && doc.nextSlots.length > 0)
            slotMatch = doc.nextSlots[0];
        if (!slotMatch)
            return reply.code(409).send({ error: "slot_unavailable", message: "No slots available." });
        const updated = {
            ...booking,
            slotAtIso: slotMatch.atIso,
            mode: slotMatch.mode,
            status: "rescheduled",
            feeInr: resolveConsultationFee(booking.doctorId, slotMatch.mode)
        };
        await repo.saveBooking(updated);
        await upsertDashboardFromBooking(updated);
        const saved = await repo.getBooking(id);
        return { booking: saved, doctor: applyLivePrices(doc) };
    });
    app.get("/api/v1/schedule", async () => ({
        slots: getSchedule(),
        open_slots: [...getOpenSlots()]
    }));
    app.post("/api/v1/schedule/slot", async (req, reply) => {
        const { t } = req.query;
        if (!t?.trim())
            return reply.code(400).send({ detail: "t_required" });
        const label = t.includes("AM") || t.includes("PM") ? t : `${t} PM`;
        setSchedule([...getSchedule(), { t, open: true, pid: null, now: false }]);
        setOpenSlots([...getOpenSlots(), label]);
        await persistRuntimeState();
        return { ok: true, t };
    });
    app.get("/api/v1/patients", async (req) => {
        const { q = "" } = req.query;
        const needle = q.trim().toLowerCase();
        const items = await repo.listDashboardPatients();
        if (!needle)
            return items;
        return items.filter((p) => p.name.toLowerCase().includes(needle) ||
            p.symptom.toLowerCase().includes(needle) ||
            p.comorb.join(" ").toLowerCase().includes(needle));
    });
    app.get("/api/v1/patients/:id/record", async (req, reply) => {
        const pid = Number(req.params.id);
        if (!Number.isFinite(pid))
            return reply.code(400).send({ detail: "invalid_id" });
        let patient;
        try {
            patient = await patientOr404(pid);
        }
        catch {
            return reply.code(404).send({ detail: "patient_not_found" });
        }
        const bookingId = await repo.getBookingIdForPatient(pid);
        const booking = bookingId ? await repo.getBooking(bookingId) : undefined;
        const session = booking ? await repo.getSession(booking.sessionId) : undefined;
        const doc = booking
            ? doctors.find((d) => d.id === booking.doctorId)
            : doctors.find((d) => d.id === CONSOLE_DOCTOR_ID);
        const triage = session?.triage;
        const input = session?.triageInput;
        const history = session?.history;
        const nextStepLabel = (step) => {
            switch (step) {
                case "urgent_human_help":
                    return "Urgent evaluation recommended";
                case "doctor_consult_recommended":
                    return "Doctor consult recommended";
                case "self_care":
                    return "Self-care guidance";
                default:
                    return "Not assessed";
            }
        };
        return {
            patient_id: pid,
            color: patient.color,
            booking_ref: booking ? `CC-${booking.id.toUpperCase()}` : null,
            demographics: {
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                phone: booking?.patient.phone,
                address: booking ? formatPatientAddress(booking.patient) : undefined,
                city: booking?.patient.city,
                village: booking?.patient.village,
                pincode: booking?.patient.pincode,
                house_number: booking?.patient.house_number
            },
            visit: {
                mode: patient.mode,
                time: patient.time,
                slot_at_iso: booking?.slotAtIso ?? null,
                fee_inr: patient.fee,
                status: patient.status,
                doctor_name: doc?.name ?? getDashboardProfileSync().name,
                booked_at_iso: booking?.createdAtIso ?? null
            },
            triage: {
                score: patient.score,
                tier: patient.tier,
                severity_0_to_10: input?.severity0to10,
                recommended_next_step: nextStepLabel(triage?.recommendedNextStep),
                red_flag_triggered: triage?.redFlagTriggered ?? patient.flags.length > 0,
                reasons: triage?.reasons ?? [],
                summary: triage?.summaryForDoctor.oneLiner ?? patient.symptom,
                bullets: triage?.summaryForDoctor.bullets ?? [],
                flags: patient.flags
            },
            symptoms: {
                main: input?.mainSymptom ?? patient.symptom,
                detail: input?.symptomText,
                onset: patient.onset
            },
            history: {
                conditions: history?.conditions ?? patient.comorb,
                medications: history?.meds ?? [],
                recent_tests: history?.recentTests ?? [],
                insurance: history?.insuranceProvider,
                consent_collected: Boolean(session?.consentToCollectHealthInfo)
            }
        };
    });
    app.get("/api/v1/messages", async () => repo.listThreadSummaries());
    app.get("/api/v1/messages/:pid", async (req, reply) => {
        const pid = Number(req.params.pid);
        const th = await repo.getThread(pid);
        if (!th)
            return reply.code(404).send({ detail: "thread_not_found" });
        return repo.markThreadRead(pid);
    });
    app.post("/api/v1/messages/:pid", async (req, reply) => {
        const pid = Number(req.params.pid);
        const { text } = req.body;
        if (!text?.trim())
            return reply.code(400).send({ detail: "text_required" });
        try {
            await patientOr404(pid);
        }
        catch {
            return reply.code(404).send({ detail: "thread_not_found" });
        }
        return repo.appendThreadMessage(pid, { who: "me", t: "Just now", txt: text.trim() });
    });
    app.get("/api/v1/reports", async () => {
        const patients = await repo.listDashboardPatients();
        const byTier = { high: 0, moderate: 0, low: 0 };
        const symptoms = new Map();
        for (const p of patients) {
            byTier[p.tier]++;
            symptoms.set(p.symptom, (symptoms.get(p.symptom) ?? 0) + 1);
        }
        const total = patients.length || 1;
        const topSymptoms = [...symptoms.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([symptom, n]) => ({ symptom, n }));
        return {
            summary: {
                consults: patients.length,
                delta_pct: patients.length > 0 ? 12 : 0,
                completion_pct: patients.length
                    ? Math.round((patients.filter((p) => p.status === "accepted").length / patients.length) * 100)
                    : 0,
                no_shows: 0,
                avg_consult_min: 14,
                earnings_inr: await totalEarningsInr()
            },
            consults_by_day: [
                { day: "Mon", n: Math.max(1, Math.floor(patients.length * 0.12)) },
                { day: "Tue", n: Math.max(1, Math.floor(patients.length * 0.17)) },
                { day: "Wed", n: Math.max(1, Math.floor(patients.length * 0.1)) },
                { day: "Thu", n: Math.max(1, Math.floor(patients.length * 0.19)) },
                { day: "Fri", n: Math.max(1, Math.floor(patients.length * 0.14)) },
                { day: "Sat", n: Math.max(1, Math.floor(patients.length * 0.21)) },
                { day: "Sun", n: Math.max(1, Math.floor(patients.length * 0.07)) }
            ],
            triage_mix: ["high", "moderate", "low"].map((tier) => ({
                tier,
                n: byTier[tier],
                pct: Math.round((byTier[tier] / total) * 100)
            })),
            top_symptoms: topSymptoms.length > 0
                ? topSymptoms
                : [
                    { symptom: "Fever", n: 0 },
                    { symptom: "Cough", n: 0 },
                    { symptom: "Headache", n: 0 }
                ]
        };
    });
    app.get("/api/v1/profile", async () => {
        const profile = getDashboardProfileSync();
        return { ...profile, home_fee: profile.home_fee ?? 799 };
    });
    app.put("/api/v1/profile", async (req) => {
        const body = req.body;
        const patch = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== null));
        if (patch.fee != null)
            patch.fee = Number(patch.fee);
        if (patch.home_fee != null)
            patch.home_fee = Number(patch.home_fee);
        const profile = await saveProfileState(patch);
        const doc = doctors.find((d) => d.id === CONSOLE_DOCTOR_ID) ?? doctors[0];
        if (doc) {
            doc.price.video = resolveConsultationFee(CONSOLE_DOCTOR_ID, "video");
            doc.price.home = resolveConsultationFee(CONSOLE_DOCTOR_ID, "home");
        }
        await refreshAllBookingFees();
        return { ...profile };
    });
    app.post("/api/v1/availability", async (req) => {
        const { available } = req.body;
        setAvailable(Boolean(available));
        await persistRuntimeState();
        return { available: getAvailable() };
    });
    // --- legacy routes (backward compat) ---
    app.get("/api/v1/doctor/queue", async (req) => {
        const { tier } = req.query;
        let items = await repo.listDashboardPatients();
        items = items.sort((a, b) => b.score - a.score);
        if (tier)
            items = items.filter((p) => p.tier === tier);
        return Promise.all(items.map(async (p) => {
            const bid = await repo.getBookingIdForPatient(p.id);
            const booking = bid ? await repo.getBooking(bid) : undefined;
            return {
                id: bid ?? String(p.id),
                name: p.name,
                symptom: p.symptom,
                details: p.flags,
                score: p.score,
                tier: p.tier,
                redFlag: p.flags.length > 0,
                conditions: p.comorb,
                mode: p.mode,
                time: p.time,
                doctorId: booking?.doctorId,
                status: p.status,
                color: p.color
            };
        }));
    });
    app.get("/api/v1/doctor/stats", async () => {
        const patients = await repo.listDashboardPatients();
        const pending = patients.filter((p) => p.status === "pending");
        return {
            booked_today: patients.length,
            pending: pending.length,
            high_triage_pending: pending.filter((p) => p.tier === "high").length,
            video: patients.filter((p) => p.mode === "Video").length,
            home_visits: patients.filter((p) => p.mode === "Home visit").length
        };
    });
    app.get("/api/v1/doctor/:doctorId/slots", async (req, reply) => {
        const { doctorId } = req.params;
        const doc = doctors.find((d) => d.id === doctorId);
        if (!doc)
            return reply.code(404).send({ error: "doctor_not_found" });
        return doc.nextSlots.map((s) => ({
            atIso: s.atIso,
            mode: s.mode,
            label: fmtTime(s.atIso)
        }));
    });
    app.post("/api/v1/doctor/booking/:id/accept", async (req, reply) => {
        const { id } = req.params;
        const pid = await repo.getPatientIdForBooking(id);
        if (pid == null)
            return reply.code(404).send({ error: "booking_not_found" });
        const booking = await repo.getBooking(id);
        if (!booking)
            return reply.code(404).send({ error: "booking_not_found" });
        if (booking.status === "accepted")
            return reply.code(409).send({ error: "already_accepted" });
        const p = await repo.getDashboardPatient(pid);
        if (!p)
            return reply.code(404).send({ error: "patient_not_found" });
        const accepted = { ...p, status: "accepted" };
        await repo.upsertDashboardPatient(id, accepted);
        await notifyPatientApproval(pid, accepted);
        return accepted;
    });
    app.patch("/api/v1/doctor/booking/:id/reschedule", async (req, reply) => {
        const { id } = req.params;
        const { slotAtIso } = req.body;
        const booking = await repo.getBooking(id);
        if (!booking)
            return reply.code(404).send({ error: "booking_not_found" });
        if (!slotAtIso)
            return reply.code(400).send({ error: "invalid_request", message: "slotAtIso required" });
        const doc = doctors.find((d) => d.id === booking.doctorId);
        if (!doc)
            return reply.code(404).send({ error: "doctor_not_found" });
        const slot = doc.nextSlots.find((s) => s.atIso === slotAtIso);
        if (!slot)
            return reply.code(409).send({ error: "slot_unavailable" });
        const updated = {
            ...booking,
            slotAtIso: slot.atIso,
            mode: slot.mode,
            status: "rescheduled",
            feeInr: resolveConsultationFee(booking.doctorId, slot.mode)
        };
        await repo.saveBooking(updated);
        await upsertDashboardFromBooking(updated);
        const pid = await repo.getPatientIdForBooking(id);
        return (await repo.getDashboardPatient(pid));
    });
    await refreshScheduleFromBookings();
}

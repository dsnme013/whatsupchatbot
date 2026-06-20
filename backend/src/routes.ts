import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { doctors } from "./data/doctors.js";
import { applyLivePrices, resolveConsultationFee } from "./lib/fees.js";
import { triage } from "./lib/triage.js";
import {
  ConsentSchema,
  CreateBookingSchema,
  DoctorMatchRequestSchema,
  HistorySchema,
  TriageRequestSchema
} from "./schemas.js";
import { upsertDashboardFromBooking } from "./doctor.js";
import * as bookingRepo from "./db/repositories.js";
import * as sessionRepo from "./db/repositories.js";
import { getStorageMode } from "./db/connectionState.js";
import { pingDatabase } from "./db/client.js";

function rankDoctors(args: {
  mode?: "video" | "home";
  gender?: "female" | "male" | "nonbinary";
  language?: string;
  sortBy?: "best_fit" | "soonest" | "top_rated" | "fastest_response";
  mainSymptom: string;
  comorbidities?: string[];
}) {
  const symptom = args.mainSymptom.toLowerCase();
  const comorb = (args.comorbidities ?? []).map((c) => c.toLowerCase());

  const filtered = doctors
    .filter((d) => (args.gender ? d.gender === args.gender : true))
    .filter((d) => (args.language ? d.languages.includes(args.language) : true))
    .map((d) => {
      const slots = args.mode
        ? d.nextSlots.filter((s) => s.mode === args.mode)
        : d.nextSlots;

      const soonest = slots
        .map((s) => new Date(s.atIso).getTime())
        .sort((a, b) => a - b)[0];

      let fit = 0;
      const specText = d.specialties.join(" ").toLowerCase();
      if (specText.includes("fever") && symptom.includes("fever")) fit += 18;
      if (specText.includes("headache") && symptom.includes("head")) fit += 18;
      if (specText.includes("infection") && (symptom.includes("fever") || symptom.includes("cold") || symptom.includes("cough"))) fit += 10;
      if (comorb.includes("bp") || comorb.includes("hypertension")) {
        if (specText.includes("internal medicine") || specText.includes("chronic")) fit += 12;
      }
      fit += Math.round(d.rating * 6);
      fit += Math.round(Math.min(d.reviewCount, 80) / 8);
      fit -= Math.round(d.responseTimeMinsP50 / 6);
      if (Number.isFinite(soonest)) fit += 6;

      return {
        doctor: d,
        soonestAtMs: soonest ?? Number.POSITIVE_INFINITY,
        fitScore: fit
      };
    })
    .filter((x) => (args.mode ? x.doctor.nextSlots.some((s) => s.mode === args.mode) : true));

  const sortBy = args.sortBy ?? "best_fit";
  if (sortBy === "soonest") filtered.sort((a, b) => a.soonestAtMs - b.soonestAtMs);
  else if (sortBy === "top_rated") filtered.sort((a, b) => b.doctor.rating - a.doctor.rating);
  else if (sortBy === "fastest_response") filtered.sort((a, b) => a.doctor.responseTimeMinsP50 - b.doctor.responseTimeMinsP50);
  else filtered.sort((a, b) => b.fitScore - a.fitScore);

  return filtered.map((x, idx) => ({
    ...x.doctor,
    match: {
      rank: idx + 1,
      score: x.fitScore,
      label:
        idx === 0
          ? "Best fit"
          : x.doctor.badges.includes("Fastest availability")
            ? "Soonest"
            : "Good option"
    }
  }));
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/api/v1/health", async () => {
    const storage = getStorageMode();
    const db = storage === "memory" ? true : await pingDatabase();
    return {
      ok: db,
      db: storage === "memory" ? "memory" : db ? "connected" : "disconnected",
      storage,
      ts: new Date().toISOString()
    };
  });

  app.get("/api/v1/fees/:doctorId", async (req, reply) => {
    const { doctorId } = req.params as { doctorId: string };
    const doc = doctors.find((d) => d.id === doctorId);
    if (!doc) return reply.code(404).send({ error: "doctor_not_found" });
    return {
      video: resolveConsultationFee(doctorId, "video"),
      home: resolveConsultationFee(doctorId, "home")
    };
  });

  app.post("/api/v1/session", async () => {
    const sessionId = nanoid(12);
    await sessionRepo.createSession(sessionId);
    return { sessionId };
  });

  app.post("/api/v1/triage", async (req, reply) => {
    const parsed = TriageRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });

    const result = triage(parsed.data);
    if (parsed.data.sessionId) {
      const s = await sessionRepo.getSession(parsed.data.sessionId);
      if (s) {
        s.triageInput = parsed.data;
        s.triage = result;
        await sessionRepo.saveSession(s);
      }
    }
    return { triage: result };
  });

  app.post("/api/v1/match/doctors", async (req, reply) => {
    const parsed = DoctorMatchRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });

    const { triage: triageReq, preferences } = parsed.data;
    const triageResult = triage(triageReq);

    if (triageReq.sessionId) {
      const s = await sessionRepo.getSession(triageReq.sessionId);
      if (s) {
        s.triageInput = triageReq;
        s.triage = triageResult;
        await sessionRepo.saveSession(s);
      }
    }

    const list = rankDoctors({
      mainSymptom: triageReq.mainSymptom,
      comorbidities: triageReq.comorbidities,
      mode: preferences?.mode,
      gender: preferences?.gender,
      language: preferences?.language,
      sortBy: preferences?.sortBy
    });

    return {
      triage: triageResult,
      doctors: list.map(applyLivePrices)
    };
  });

  app.post("/api/v1/consent", async (req, reply) => {
    const parsed = ConsentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });

    const s = await sessionRepo.getSession(parsed.data.sessionId);
    if (!s) return reply.code(404).send({ error: "session_not_found" });

    s.consentToCollectHealthInfo = parsed.data.consentToCollectHealthInfo;
    await sessionRepo.saveSession(s);
    return { ok: true, session: s };
  });

  app.post("/api/v1/history", async (req, reply) => {
    const parsed = HistorySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });

    const s = await sessionRepo.getSession(parsed.data.sessionId);
    if (!s) return reply.code(404).send({ error: "session_not_found" });

    if (s.consentToCollectHealthInfo !== true) {
      return reply.code(409).send({
        error: "consent_required",
        message: "Consent is required before collecting health history."
      });
    }

    s.history = {
      conditions: parsed.data.conditions,
      meds: parsed.data.meds,
      recentTests: parsed.data.recentTests,
      insuranceProvider: parsed.data.insuranceProvider
    };
    await sessionRepo.saveSession(s);
    return { ok: true, session: s };
  });

  app.post("/api/v1/booking", async (req, reply) => {
    const parsed = CreateBookingSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", details: parsed.error.flatten() });

    const s = await sessionRepo.getSession(parsed.data.sessionId);
    if (!s) return reply.code(404).send({ error: "session_not_found" });

    const doc = doctors.find((d) => d.id === parsed.data.doctorId);
    if (!doc) return reply.code(404).send({ error: "doctor_not_found" });

    let slot = doc.nextSlots.find(
      (sl) => sl.atIso === parsed.data.slotAtIso && sl.mode === parsed.data.mode
    );
    if (!slot) {
      slot = doc.nextSlots.find((sl) => sl.mode === parsed.data.mode);
    }
    if (!slot) {
      slot = doc.nextSlots.find((sl) => sl.atIso === parsed.data.slotAtIso);
    }
    if (!slot && doc.nextSlots.length > 0) {
      slot = doc.nextSlots[0];
    }
    if (!slot) return reply.code(409).send({ error: "slot_unavailable", message: "No slots available for this doctor." });

    const id = nanoid(10);
    const booking = {
      id,
      sessionId: parsed.data.sessionId,
      createdAtIso: new Date().toISOString(),
      doctorId: parsed.data.doctorId,
      slotAtIso: slot.atIso,
      mode: slot.mode,
      feeInr: resolveConsultationFee(doc.id, slot.mode),
      patient: parsed.data.patient
    };

    await bookingRepo.saveBooking(booking);
    await upsertDashboardFromBooking(booking);
    return {
      booking: { ...booking, feeInr: resolveConsultationFee(doc.id, slot.mode) },
      checklist: [
        { id: "temp", when: "now", text: "Measure temperature (or share last reading)" },
        { id: "bp", when: "now", text: "Keep BP readings from last 3 days handy" },
        { id: "meds", when: "before", text: "Keep your medication strip visible" },
        { id: "notes", when: "before", text: "Note exact timing of symptoms + anything that worsens it" }
      ]
    };
  });

  app.get("/api/v1/booking/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const booking = await bookingRepo.getBooking(id);
    if (!booking) {
      return reply.code(404).send({
        error: "booking_not_found",
        message: "Booking not found."
      });
    }
    const doc = doctors.find((d) => d.id === booking.doctorId);
    const liveFee = resolveConsultationFee(booking.doctorId, booking.mode);
    const liveBooking = { ...booking, feeInr: liveFee };
    let approvalMessage = booking.approvalMessage ?? null;
    if (booking.status === "accepted" && doc) {
      const modeLabel = booking.mode === "video" ? "Video consult" : "Home visit";
      const timeLabel = new Date(booking.slotAtIso).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit"
      });
      approvalMessage = `✅ Your appointment is approved! ${doc.name} confirmed your ${modeLabel} on ${timeLabel}. Ref CC-${booking.id.toUpperCase()}. Fee ₹${liveFee}. We'll remind you before your visit.`;
    }
    let rescheduleMessage = booking.rescheduleMessage ?? null;
    if (booking.rescheduledAtIso && doc) {
      const modeLabel = booking.mode === "video" ? "Video consult" : "Home visit";
      const whenLabel = new Date(booking.slotAtIso).toLocaleString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
      rescheduleMessage = `📅 Your doctor rescheduled your appointment. ${doc.name} • ${modeLabel} • ${whenLabel} • Ref CC-${booking.id.toUpperCase()} • Fee ₹${liveFee}.`;
    }
    return {
      booking: liveBooking,
      doctor: doc ? applyLivePrices(doc) : null,
      approvalMessage,
      rescheduleMessage
    };
  });
}

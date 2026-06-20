import { z } from "zod";
import type { Doctor, TriageResult } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.toString() ?? "http://127.0.0.1:8787";

async function http<T>(path: string, init?: RequestInit, schema?: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    signal: init?.signal ?? AbortSignal.timeout(12_000),
    ...init
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = typeof json?.error === "string" ? json.error : "request_failed";
    const msg = typeof json?.message === "string" ? json.message : "Request failed";
    throw new Error(`${res.status}:${code}:${msg}`);
  }
  if (schema) {
    try {
      return schema.parse(json);
    } catch (e) {
      if (e instanceof z.ZodError) {
        throw new Error(`500:invalid_response:Unexpected server response`);
      }
      throw e;
    }
  }
  return json as T;
}

const CreateSessionRes = z.object({ sessionId: z.string() });

export async function createSession() {
  return http("/api/v1/session", { method: "POST", body: "{}" }, CreateSessionRes);
}

const TriageRes = z.object({
  triage: z.object({
    score0to100: z.number(),
    severity: z.enum(["low", "moderate", "high"]),
    recommendedNextStep: z.enum(["self_care", "doctor_consult_recommended", "urgent_human_help"]),
    reasons: z.array(z.string()),
    redFlagTriggered: z.boolean(),
    summaryForDoctor: z.object({
      oneLiner: z.string(),
      bullets: z.array(z.string())
    })
  })
});

const MatchRes = z.object({
  triage: TriageRes.shape.triage,
  doctors: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      gender: z.enum(["female", "male", "nonbinary"]),
      specialties: z.array(z.string()),
      yearsExp: z.number(),
      rating: z.number(),
      reviewCount: z.number(),
      languages: z.array(z.string()),
      badges: z.array(z.string()),
      nextSlots: z.array(z.object({ atIso: z.string(), mode: z.enum(["video", "home"]) })),
      price: z.object({ video: z.number(), home: z.number() }),
      responseTimeMinsP50: z.number(),
      highlights: z.array(z.string()),
      match: z.object({ rank: z.number(), score: z.number(), label: z.string() }).optional()
    })
  )
});

export async function matchDoctors(payload: {
  triage: {
    sessionId?: string;
    mainSymptom: string;
    symptomText?: string;
    onset: "today" | "yesterday" | "2-3days" | "1week+";
    severity0to10: number;
    age?: number;
    comorbidities?: string[];
    redFlags?: Record<string, boolean | undefined>;
  };
  preferences?: { mode?: "video" | "home"; gender?: "female" | "male"; sortBy?: string };
}): Promise<{ triage: TriageResult; doctors: Doctor[] }> {
  return http("/api/v1/match/doctors", { method: "POST", body: JSON.stringify(payload) }, MatchRes);
}

export async function saveConsent(payload: { sessionId: string; consentToCollectHealthInfo: boolean }) {
  return http("/api/v1/consent", { method: "POST", body: JSON.stringify(payload) });
}

export async function saveHistory(payload: {
  sessionId: string;
  conditions?: string[];
  meds?: string[];
  recentTests?: string[];
  insuranceProvider?: string;
}) {
  return http("/api/v1/history", { method: "POST", body: JSON.stringify(payload) });
}

const BookingShape = z.object({
  id: z.string(),
  sessionId: z.string(),
  doctorId: z.string(),
  slotAtIso: z.string(),
  mode: z.enum(["video", "home"]),
  createdAtIso: z.string(),
  feeInr: z.number().optional()
});

const CreateBookingRes = z.object({
  booking: BookingShape,
  checklist: z.array(z.object({ id: z.string(), when: z.enum(["now", "before"]), text: z.string() }))
});

export async function createBooking(payload: {
  sessionId: string;
  doctorId: string;
  slotAtIso: string;
  mode: "video" | "home";
  patient: {
    name: string;
    age?: number;
    gender?: "male" | "female" | "other";
    phone?: string;
    address?: string;
    city?: string;
    village?: string;
    pincode?: string;
    house_number?: string;
  };
}) {
  return http("/api/v1/booking", { method: "POST", body: JSON.stringify(payload) }, CreateBookingRes);
}

const RescheduleBookingRes = z.object({
  booking: BookingShape,
  doctor: z
    .object({
      id: z.string(),
      name: z.string(),
      price: z.object({ video: z.number(), home: z.number() })
    })
    .passthrough()
    .nullable()
    .optional()
});

export async function rescheduleBooking(
  bookingId: string,
  payload: { slotAtIso: string; mode: "video" | "home" }
) {
  return http(
    `/api/v1/booking/${bookingId}/reschedule`,
    { method: "PATCH", body: JSON.stringify(payload) },
    RescheduleBookingRes
  );
}

const GetBookingRes = z.object({
  booking: CreateBookingRes.shape.booking.extend({
    status: z.enum(["pending", "accepted", "rescheduled"]).optional(),
    acceptedAtIso: z.string().optional(),
    approvalMessage: z.string().optional(),
    rescheduledAtIso: z.string().optional(),
    rescheduleMessage: z.string().optional()
  }),
  doctor: z.object({ id: z.string(), name: z.string() }).passthrough().nullable(),
  approvalMessage: z.string().nullable().optional(),
  rescheduleMessage: z.string().nullable().optional()
});

export async function getBooking(bookingId: string) {
  return http(`/api/v1/booking/${bookingId}`, undefined, GetBookingRes);
}

const DoctorFeesRes = z.object({
  video: z.number(),
  home: z.number()
});

export async function getDoctorFees(doctorId: string) {
  return http(`/api/v1/fees/${doctorId}`, undefined, DoctorFeesRes);
}


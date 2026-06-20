import type { Prisma } from "@prisma/client";
import type { TriageInput, TriageResult } from "../lib/triage.js";
import type {
  Booking,
  DashboardMessage,
  DashboardPatient,
  DashboardProfile,
  DashboardScheduleSlot,
  DashboardThread,
  SessionState
} from "../store.js";

export const DEFAULT_PROFILE: DashboardProfile = {
  name: "Dr. Arjun Mehta",
  speciality: "General Physician",
  fee: 499,
  home_fee: 799,
  languages: "English, Hindi",
  bio: "15+ years in family medicine. Calm, thorough, and focused on practical home-care advice.",
  accept_video: true,
  accept_home_visits: true,
  auto_accept_low: false,
  whatsapp_notifications: true
};

export function rowToSession(row: {
  sessionId: string;
  createdAt: Date;
  consentToCollectHealthInfo: boolean | null;
  triageInput: Prisma.JsonValue;
  triage: Prisma.JsonValue;
  history: Prisma.JsonValue;
}): SessionState {
  return {
    sessionId: row.sessionId,
    createdAtIso: row.createdAt.toISOString(),
    consentToCollectHealthInfo: row.consentToCollectHealthInfo ?? undefined,
    triageInput: (row.triageInput as TriageInput | null) ?? undefined,
    triage: (row.triage as TriageResult | null) ?? undefined,
    history: (row.history as SessionState["history"] | null) ?? undefined
  };
}

export function rowToBooking(row: {
  id: string;
  sessionId: string;
  createdAt: Date;
  doctorId: string;
  slotAtIso: Date;
  mode: string;
  feeInr: number | null;
  status: string;
  acceptedAtIso: Date | null;
  approvalMessage: string | null;
  rescheduledAtIso: Date | null;
  rescheduleMessage: string | null;
  patientName: string;
  patientAge: number | null;
  patientGender: string | null;
  patientPhone: string | null;
  patientAddress: string | null;
  patientCity: string | null;
  patientVillage: string | null;
  patientPincode: string | null;
  patientHouseNumber: string | null;
}): Booking {
  return {
    id: row.id,
    sessionId: row.sessionId,
    createdAtIso: row.createdAt.toISOString(),
    doctorId: row.doctorId,
    slotAtIso: row.slotAtIso.toISOString(),
    mode: row.mode as Booking["mode"],
    feeInr: row.feeInr ?? undefined,
    status: row.status as Booking["status"],
    acceptedAtIso: row.acceptedAtIso?.toISOString(),
    approvalMessage: row.approvalMessage ?? undefined,
    rescheduledAtIso: row.rescheduledAtIso?.toISOString(),
    rescheduleMessage: row.rescheduleMessage ?? undefined,
    patient: {
      name: row.patientName,
      age: row.patientAge ?? undefined,
      gender: (row.patientGender as Booking["patient"]["gender"]) ?? undefined,
      phone: row.patientPhone ?? undefined,
      address: row.patientAddress ?? undefined,
      city: row.patientCity ?? undefined,
      village: row.patientVillage ?? undefined,
      pincode: row.patientPincode ?? undefined,
      house_number: row.patientHouseNumber ?? undefined
    }
  };
}

export function bookingToRowData(booking: Booking) {
  return {
    sessionId: booking.sessionId,
    doctorId: booking.doctorId,
    slotAtIso: new Date(booking.slotAtIso),
    mode: booking.mode,
    feeInr: booking.feeInr ?? null,
    status: booking.status ?? "pending",
    acceptedAtIso: booking.acceptedAtIso ? new Date(booking.acceptedAtIso) : null,
    approvalMessage: booking.approvalMessage ?? null,
    rescheduledAtIso: booking.rescheduledAtIso ? new Date(booking.rescheduledAtIso) : null,
    rescheduleMessage: booking.rescheduleMessage ?? null,
    patientName: booking.patient.name,
    patientAge: booking.patient.age ?? null,
    patientGender: booking.patient.gender ?? null,
    patientPhone: booking.patient.phone ?? null,
    patientAddress: booking.patient.address ?? null,
    patientCity: booking.patient.city ?? null,
    patientVillage: booking.patient.village ?? null,
    patientPincode: booking.patient.pincode ?? null,
    patientHouseNumber: booking.patient.house_number ?? null
  };
}

export function rowToDashboardPatient(row: {
  id: number;
  bookingId: string;
  name: string;
  age: number;
  gender: string;
  symptom: string;
  onset: string;
  score: number;
  tier: string;
  flags: Prisma.JsonValue;
  comorb: Prisma.JsonValue;
  mode: string;
  time: string;
  color: string;
  status: string;
  fee: number;
}): DashboardPatient {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender as DashboardPatient["gender"],
    symptom: row.symptom,
    onset: row.onset,
    score: row.score,
    tier: row.tier as DashboardPatient["tier"],
    flags: row.flags as string[],
    comorb: row.comorb as string[],
    mode: row.mode as DashboardPatient["mode"],
    time: row.time,
    color: row.color,
    status: row.status as DashboardPatient["status"],
    fee: row.fee
  };
}

export function rowToProfile(row: {
  name: string;
  speciality: string;
  fee: number;
  homeFee: number;
  languages: string;
  bio: string;
  acceptVideo: boolean;
  acceptHomeVisits: boolean;
  autoAcceptLow: boolean;
  whatsappNotifications: boolean;
}): DashboardProfile {
  return {
    name: row.name,
    speciality: row.speciality,
    fee: row.fee,
    home_fee: row.homeFee,
    languages: row.languages,
    bio: row.bio,
    accept_video: row.acceptVideo,
    accept_home_visits: row.acceptHomeVisits,
    auto_accept_low: row.autoAcceptLow,
    whatsapp_notifications: row.whatsappNotifications
  };
}

export function profileToRowData(patch: Partial<DashboardProfile>) {
  return {
    ...(patch.name != null ? { name: patch.name } : {}),
    ...(patch.speciality != null ? { speciality: patch.speciality } : {}),
    ...(patch.fee != null ? { fee: patch.fee } : {}),
    ...(patch.home_fee != null ? { homeFee: patch.home_fee } : {}),
    ...(patch.languages != null ? { languages: patch.languages } : {}),
    ...(patch.bio != null ? { bio: patch.bio } : {}),
    ...(patch.accept_video != null ? { acceptVideo: patch.accept_video } : {}),
    ...(patch.accept_home_visits != null ? { acceptHomeVisits: patch.accept_home_visits } : {}),
    ...(patch.auto_accept_low != null ? { autoAcceptLow: patch.auto_accept_low } : {}),
    ...(patch.whatsapp_notifications != null
      ? { whatsappNotifications: patch.whatsapp_notifications }
      : {})
  };
}

export function rowToThread(row: {
  patientId: number;
  unread: boolean;
  messages: Array<{ who: string; t: string; txt: string; sortOrder: number }>;
}): DashboardThread {
  return {
    patient_id: row.patientId,
    unread: row.unread,
    msgs: row.messages
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({ who: m.who as DashboardMessage["who"], t: m.t, txt: m.txt }))
  };
}

export function parseScheduleJson(json: Prisma.JsonValue): DashboardScheduleSlot[] {
  if (!Array.isArray(json)) return [];
  return json as DashboardScheduleSlot[];
}

export function parseOpenSlotsJson(json: Prisma.JsonValue): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === "string");
}

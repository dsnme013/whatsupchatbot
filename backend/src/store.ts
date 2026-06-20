import type { TriageInput, TriageResult } from "./lib/triage.js";

export type SessionState = {
  sessionId: string;
  createdAtIso: string;
  consentToCollectHealthInfo?: boolean;
  triageInput?: TriageInput;
  triage?: TriageResult;
  history?: {
    conditions?: string[];
    meds?: string[];
    recentTests?: string[];
    insuranceProvider?: string;
  };
};

export type Booking = {
  id: string;
  sessionId: string;
  createdAtIso: string;
  doctorId: string;
  slotAtIso: string;
  mode: "video" | "home";
  feeInr?: number;
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
  status?: "pending" | "accepted" | "rescheduled";
  acceptedAtIso?: string;
  approvalMessage?: string;
  rescheduledAtIso?: string;
  rescheduleMessage?: string;
};

/** Doctor-dashboard Patient shape (mirrors doctor_dashboard/schemas.py). */
export type DashboardPatient = {
  id: number;
  name: string;
  age: number;
  gender: "M" | "F" | "O";
  symptom: string;
  onset: string;
  score: number;
  tier: "low" | "moderate" | "high";
  flags: string[];
  comorb: string[];
  mode: "Video" | "Home visit";
  time: string;
  color: string;
  status: "pending" | "accepted" | "rescheduled";
  fee: number;
};

export type DashboardMessage = {
  who: "me" | "them";
  t: string;
  txt: string;
};

export type DashboardThread = {
  patient_id: number;
  unread: boolean;
  msgs: DashboardMessage[];
};

export type DashboardScheduleSlot = {
  t: string;
  pid: number | null;
  open: boolean;
  now: boolean;
};

export type DashboardProfile = {
  name: string;
  speciality: string;
  fee: number;
  home_fee: number;
  languages: string;
  bio: string;
  accept_video: boolean;
  accept_home_visits: boolean;
  auto_accept_low: boolean;
  whatsapp_notifications: boolean;
};

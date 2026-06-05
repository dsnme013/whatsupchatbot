import type { TriageResult } from "./lib/triage.js";

export type SessionState = {
  sessionId: string;
  createdAtIso: string;
  consentToCollectHealthInfo?: boolean;
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
  patient: { name: string; phone?: string; address?: string };
};

export const sessions = new Map<string, SessionState>();
export const bookings = new Map<string, Booking>();


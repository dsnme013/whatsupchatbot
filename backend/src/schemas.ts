import { z } from "zod";

export const TriageRequestSchema = z.object({
  mainSymptom: z.string().min(1).max(80),
  symptomText: z.string().min(0).max(800).optional(),
  onset: z.enum(["today", "yesterday", "2-3days", "1week+"]),
  severity0to10: z.number().min(0).max(10),
  age: z.number().int().min(0).max(120).optional(),
  comorbidities: z.array(z.string().min(1).max(40)).max(12).optional(),
  redFlags: z
    .object({
      breathingTrouble: z.boolean().optional(),
      fainting: z.boolean().optional(),
      confusion: z.boolean().optional(),
      severeWeakness: z.boolean().optional(),
      chestPain: z.boolean().optional(),
      stiffNeck: z.boolean().optional(),
      severeDehydration: z.boolean().optional(),
      spo2Below92: z.boolean().optional()
    })
    .optional()
});

export const DoctorMatchRequestSchema = z.object({
  triage: TriageRequestSchema,
  preferences: z
    .object({
      mode: z.enum(["video", "home"]).optional(),
      gender: z.enum(["female", "male", "nonbinary"]).optional(),
      language: z.string().min(2).max(30).optional(),
      sortBy: z.enum(["best_fit", "soonest", "top_rated", "fastest_response"]).optional()
    })
    .optional()
});

export const ConsentSchema = z.object({
  sessionId: z.string().min(6).max(80),
  consentToCollectHealthInfo: z.boolean()
});

export const HistorySchema = z.object({
  sessionId: z.string().min(6).max(80),
  conditions: z.array(z.string().min(1).max(40)).max(20).optional(),
  meds: z.array(z.string().min(1).max(80)).max(30).optional(),
  recentTests: z.array(z.string().min(1).max(120)).max(20).optional(),
  insuranceProvider: z.string().min(2).max(80).optional()
});

export const RescheduleBookingSchema = z.object({
  slotAtIso: z.string().datetime(),
  mode: z.enum(["video", "home"])
});

export const CreateBookingSchema = z.object({
  sessionId: z.string().min(6).max(80),
  doctorId: z.string().min(3).max(80),
  slotAtIso: z.string().datetime(),
  mode: z.enum(["video", "home"]),
  patient: z.object({
    name: z.string().min(1).max(80),
    phone: z
      .union([z.literal(""), z.string().min(7).max(20)])
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    address: z
      .union([z.literal(""), z.string().max(200)])
      .optional()
      .transform((v) => (v === "" ? undefined : v))
  })
});


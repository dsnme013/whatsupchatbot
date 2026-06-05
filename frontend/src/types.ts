export type SeverityLevel = "low" | "moderate" | "high";

export type TriageResult = {
  score0to100: number;
  severity: SeverityLevel;
  recommendedNextStep: "self_care" | "doctor_consult_recommended" | "urgent_human_help";
  reasons: string[];
  redFlagTriggered: boolean;
  summaryForDoctor: {
    oneLiner: string;
    bullets: string[];
  };
};

export type Doctor = {
  id: string;
  name: string;
  gender: "female" | "male" | "nonbinary";
  specialties: string[];
  yearsExp: number;
  rating: number;
  reviewCount: number;
  languages: string[];
  badges: string[];
  nextSlots: Array<{ atIso: string; mode: "video" | "home" }>;
  price: { video: number; home: number };
  responseTimeMinsP50: number;
  highlights: string[];
  match?: { rank: number; score: number; label: string };
};


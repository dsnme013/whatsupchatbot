/**
 * CareConnect conversational health assessment — questions, emojis, points, and scoring.
 *
 * Scoring logic:
 * - Each answer adds `points` to a running total (max ~100 before red flags).
 * - 0–24  → Low concern      → self-care tips
 * - 25–49 → Moderate concern  → doctor consult recommended
 * - 50–69 → Elevated concern  → doctor consult + video option highlighted
 * - 70+   → High concern      → urgent help + video/home visit
 */

export type Onset = "today" | "yesterday" | "2-3days" | "1week+";

export type RedFlagKey =
  | "breathingTrouble"
  | "chestPain"
  | "confusion"
  | "fainting"
  | "severeDehydration";

export type AssessmentEffects = {
  mainSymptom?: string;
  onset?: Onset;
  severity0to10?: number;
  redFlag?: RedFlagKey;
  clearRedFlags?: boolean;
  comorbidity?: string;
};

export type AssessmentOption = {
  id: string;
  emoji: string;
  label: string;
  points: number;
  effects?: AssessmentEffects;
};

export type AssessmentQuestion = {
  id: string;
  emoji: string;
  text: string;
  options: AssessmentOption[];
};

export const ASSESSMENT_FLOW: AssessmentQuestion[] = [
  {
    id: "main_symptom",
    emoji: "🩺",
    text: "I'm here with you. What's the main thing bothering you right now?",
    options: [
      { id: "fever", emoji: "🌡️", label: "Fever", points: 5, effects: { mainSymptom: "Fever" } },
      { id: "headache", emoji: "🤕", label: "Headache", points: 4, effects: { mainSymptom: "Headache" } },
      { id: "cough", emoji: "😷", label: "Cough / cold", points: 4, effects: { mainSymptom: "Cough" } },
      { id: "stomach", emoji: "🤢", label: "Stomach pain", points: 5, effects: { mainSymptom: "Stomach pain" } },
      { id: "body", emoji: "💪", label: "Body ache & fatigue", points: 4, effects: { mainSymptom: "Body pain" } }
    ]
  },
  {
    id: "onset",
    emoji: "📅",
    text: "When did this start? Knowing the timeline helps us triage safely.",
    options: [
      { id: "today", emoji: "☀️", label: "Today", points: 6, effects: { onset: "today" } },
      { id: "yesterday", emoji: "🌙", label: "Yesterday", points: 10, effects: { onset: "yesterday" } },
      { id: "2-3days", emoji: "📆", label: "2–3 days ago", points: 14, effects: { onset: "2-3days" } },
      { id: "1week+", emoji: "⏳", label: "A week or more", points: 18, effects: { onset: "1week+" } }
    ]
  },
  {
    id: "severity",
    emoji: "📊",
    text: "How much is it affecting you right now? Be honest — there's no wrong answer.",
    options: [
      { id: "mild", emoji: "😊", label: "Mild — I can manage daily tasks", points: 5, effects: { severity0to10: 2 } },
      { id: "moderate", emoji: "😐", label: "Moderate — uncomfortable but okay", points: 15, effects: { severity0to10: 5 } },
      { id: "severe", emoji: "😣", label: "Severe — hard to focus or rest", points: 25, effects: { severity0to10: 7 } },
      { id: "very_severe", emoji: "🆘", label: "Very severe — worst I've felt", points: 35, effects: { severity0to10: 9 } }
    ]
  },
  {
    id: "red_flags",
    emoji: "🚨",
    text: "Any of these urgent warning signs? Tap the one that applies, or choose None.",
    options: [
      { id: "none", emoji: "✅", label: "None of these", points: 0, effects: { clearRedFlags: true } },
      { id: "breathing", emoji: "😮‍💨", label: "Breathing trouble", points: 35, effects: { redFlag: "breathingTrouble" } },
      { id: "chest", emoji: "💔", label: "Chest pain", points: 35, effects: { redFlag: "chestPain" } },
      { id: "confusion", emoji: "😵‍💫", label: "Confusion / fainting", points: 35, effects: { redFlag: "confusion" } },
      { id: "dehydration", emoji: "💧", label: "Severe dehydration", points: 30, effects: { redFlag: "severeDehydration" } }
    ]
  },
  {
    id: "comorbidities",
    emoji: "💊",
    text: "Do you have any ongoing health conditions I should factor in?",
    options: [
      { id: "none", emoji: "👍", label: "None / not sure", points: 0 },
      { id: "bp", emoji: "❤️‍🩹", label: "Blood pressure (BP)", points: 8, effects: { comorbidity: "BP" } },
      { id: "diabetes", emoji: "🩸", label: "Diabetes", points: 8, effects: { comorbidity: "Diabetes" } },
      { id: "multiple", emoji: "📋", label: "Multiple conditions", points: 12, effects: { comorbidity: "Multiple" } }
    ]
  }
];

export type ScoreTier = {
  label: string;
  tone: "low" | "mod" | "high";
  summary: string;
  videoRecommended: boolean;
  homeVisitRecommended: boolean;
};

export function getScoreTier(total: number, hasRedFlag: boolean): ScoreTier {
  if (hasRedFlag || total >= 70) {
    return {
      label: "High",
      tone: "high",
      summary: "Your answers suggest you should speak with a clinician soon. Video or home visit is available now.",
      videoRecommended: true,
      homeVisitRecommended: true
    };
  }
  if (total >= 50) {
    return {
      label: "Elevated",
      tone: "mod",
      summary: "A doctor consult is a good next step. Video consultation is available if you'd prefer not to travel.",
      videoRecommended: true,
      homeVisitRecommended: true
    };
  }
  if (total >= 25) {
    return {
      label: "Moderate",
      tone: "mod",
      summary: "Monitoring at home may be okay, but a doctor consult is recommended to be safe.",
      videoRecommended: true,
      homeVisitRecommended: false
    };
  }
  return {
    label: "Low",
    tone: "low",
    summary: "Self-care with monitoring looks reasonable. Book a doctor if symptoms worsen.",
    videoRecommended: false,
    homeVisitRecommended: false
  };
}

export function formatScoreMessage(added: number, total: number) {
  return `+${added} pts → Running score: ${total}`;
}

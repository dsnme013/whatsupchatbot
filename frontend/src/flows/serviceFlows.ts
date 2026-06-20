import type { AssessmentQuestion } from "../assessment/flow";

export type CareIntent = "symptoms" | "refill" | "lab_report" | "nurse_care" | "emergency";

export const REFILL_FLOW: AssessmentQuestion[] = [
  {
    id: "refill_meds",
    emoji: "💊",
    text: "Which medicines do you need refilled?",
    options: [
      { id: "bp", emoji: "❤️‍🩹", label: "BP / heart medicines", points: 8, effects: { mainSymptom: "Medicine refill", symptomDetail: "BP/heart medicines" } },
      { id: "diabetes", emoji: "🩸", label: "Diabetes medicines", points: 8, effects: { mainSymptom: "Medicine refill", symptomDetail: "Diabetes medicines" } },
      { id: "thyroid", emoji: "🦋", label: "Thyroid medicines", points: 6, effects: { mainSymptom: "Medicine refill", symptomDetail: "Thyroid medicines" } },
      { id: "other", emoji: "📋", label: "Other regular medicines", points: 6, effects: { mainSymptom: "Medicine refill", symptomDetail: "Other regular medicines" } }
    ]
  },
  {
    id: "refill_supply",
    emoji: "📅",
    text: "How many days of medicine do you have left?",
    options: [
      { id: "none", emoji: "🚨", label: "None — ran out today", points: 20, effects: { onset: "today", severity0to10: 7 } },
      { id: "1-2", emoji: "⏰", label: "1–2 days left", points: 14, effects: { onset: "today", severity0to10: 5 } },
      { id: "3-7", emoji: "📆", label: "3–7 days left", points: 8, effects: { onset: "yesterday", severity0to10: 3 } },
      { id: "week+", emoji: "✅", label: "More than a week", points: 4, effects: { onset: "2-3days", severity0to10: 2 } }
    ]
  },
  {
    id: "refill_rx",
    emoji: "📝",
    text: "Do you have a recent prescription or photo of your medicine strip?",
    options: [
      { id: "yes_photo", emoji: "📸", label: "Yes — I can share a photo", points: 4, effects: { symptomDetail: "Has prescription photo ready" } },
      { id: "yes_old", emoji: "📄", label: "Yes — older prescription", points: 6 },
      { id: "no_regular", emoji: "🔄", label: "No — same meds for years", points: 10, effects: { severity0to10: 4 } },
      { id: "unsure", emoji: "❓", label: "Not sure", points: 8 }
    ]
  },
  {
    id: "refill_conditions",
    emoji: "💊",
    text: "Any ongoing conditions the doctor should know for this refill?",
    options: [
      { id: "none", emoji: "👍", label: "None / not sure", points: 0 },
      { id: "bp", emoji: "❤️‍🩹", label: "Blood pressure (BP)", points: 6, effects: { comorbidity: "BP" } },
      { id: "diabetes", emoji: "🩸", label: "Diabetes", points: 6, effects: { comorbidity: "Diabetes" } },
      { id: "multiple", emoji: "📋", label: "Multiple conditions", points: 10, effects: { comorbidity: "Multiple" } }
    ]
  }
];

export const LAB_REPORT_FLOW: AssessmentQuestion[] = [
  {
    id: "lab_type",
    emoji: "🔬",
    text: "Which lab report would you like help understanding?",
    options: [
      { id: "cbc", emoji: "🩸", label: "CBC / blood count", points: 6, effects: { mainSymptom: "Lab report review", symptomDetail: "CBC / blood count report" } },
      { id: "thyroid", emoji: "🦋", label: "Thyroid (TSH, T3, T4)", points: 6, effects: { mainSymptom: "Lab report review", symptomDetail: "Thyroid panel" } },
      { id: "lipid", emoji: "💛", label: "Lipid / cholesterol", points: 5, effects: { mainSymptom: "Lab report review", symptomDetail: "Lipid profile" } },
      { id: "other", emoji: "📋", label: "Other test results", points: 6, effects: { mainSymptom: "Lab report review", symptomDetail: "Other lab results" } }
    ]
  },
  {
    id: "lab_when",
    emoji: "📅",
    text: "When was this test done?",
    options: [
      { id: "today", emoji: "☀️", label: "Today", points: 8, effects: { onset: "today" } },
      { id: "yesterday", emoji: "🌙", label: "Yesterday", points: 10, effects: { onset: "yesterday" } },
      { id: "week", emoji: "📆", label: "Within the last week", points: 12, effects: { onset: "2-3days" } },
      { id: "older", emoji: "⏳", label: "More than a week ago", points: 14, effects: { onset: "1week+" } }
    ]
  },
  {
    id: "lab_concern",
    emoji: "❓",
    text: "What's your main concern about the results?",
    options: [
      { id: "high", emoji: "🔴", label: "Some values look high/low", points: 18, effects: { severity0to10: 6 } },
      { id: "symptoms", emoji: "🤒", label: "I have symptoms too", points: 22, effects: { severity0to10: 7 } },
      { id: "routine", emoji: "✅", label: "Routine check — just want clarity", points: 6, effects: { severity0to10: 3 } },
      { id: "doctor_said", emoji: "👨‍⚕️", label: "Doctor asked me to follow up", points: 12, effects: { severity0to10: 5 } }
    ]
  },
  {
    id: "lab_conditions",
    emoji: "💊",
    text: "Do you have any known health conditions?",
    options: [
      { id: "none", emoji: "👍", label: "None / not sure", points: 0 },
      { id: "bp", emoji: "❤️‍🩹", label: "Blood pressure (BP)", points: 8, effects: { comorbidity: "BP" } },
      { id: "diabetes", emoji: "🩸", label: "Diabetes", points: 8, effects: { comorbidity: "Diabetes" } },
      { id: "multiple", emoji: "📋", label: "Multiple conditions", points: 12, effects: { comorbidity: "Multiple" } }
    ]
  }
];

export const NURSE_CARE_FLOW: AssessmentQuestion[] = [
  {
    id: "nurse_type",
    emoji: "🏠",
    text: "What type of home nurse care do you need?",
    options: [
      { id: "post_surgery", emoji: "🏥", label: "Post-surgery recovery", points: 16, effects: { mainSymptom: "Home nurse care", symptomDetail: "Post-surgery recovery", preferredMode: "home", severity0to10: 6 } },
      { id: "elderly", emoji: "🧓", label: "Elderly daily care", points: 12, effects: { mainSymptom: "Home nurse care", symptomDetail: "Elderly daily care", preferredMode: "home", severity0to10: 4 } },
      { id: "wound", emoji: "🩹", label: "Wound dressing / injection", points: 14, effects: { mainSymptom: "Home nurse care", symptomDetail: "Wound dressing or injection", preferredMode: "home", severity0to10: 5 } },
      { id: "vitals", emoji: "📊", label: "Vitals monitoring at home", points: 10, effects: { mainSymptom: "Home nurse care", symptomDetail: "Home vitals monitoring", preferredMode: "home", severity0to10: 3 } }
    ]
  },
  {
    id: "nurse_duration",
    emoji: "📅",
    text: "How long do you need nurse support?",
    options: [
      { id: "once", emoji: "1️⃣", label: "One visit", points: 6, effects: { onset: "today" } },
      { id: "few_days", emoji: "📆", label: "A few days", points: 10, effects: { onset: "yesterday" } },
      { id: "week", emoji: "🗓️", label: "About a week", points: 14, effects: { onset: "2-3days" } },
      { id: "ongoing", emoji: "🔄", label: "Ongoing / regular", points: 18, effects: { onset: "1week+" } }
    ]
  },
  {
    id: "nurse_urgency",
    emoji: "⏰",
    text: "How soon do you need the first visit?",
    options: [
      { id: "today", emoji: "🚨", label: "Today — as soon as possible", points: 20, effects: { severity0to10: 7 } },
      { id: "tomorrow", emoji: "🌅", label: "Tomorrow", points: 12, effects: { severity0to10: 5 } },
      { id: "few_days", emoji: "📆", label: "Within 2–3 days", points: 8, effects: { severity0to10: 3 } },
      { id: "flexible", emoji: "✅", label: "Flexible timing", points: 4, effects: { severity0to10: 2 } }
    ]
  },
  {
    id: "nurse_conditions",
    emoji: "💊",
    text: "Any conditions or mobility needs at home?",
    options: [
      { id: "none", emoji: "👍", label: "None / independent", points: 0 },
      { id: "bp", emoji: "❤️‍🩹", label: "BP / heart condition", points: 8, effects: { comorbidity: "BP" } },
      { id: "diabetes", emoji: "🩸", label: "Diabetes", points: 8, effects: { comorbidity: "Diabetes" } },
      { id: "limited", emoji: "🦽", label: "Limited mobility / bed rest", points: 14, effects: { comorbidity: "Multiple", severity0to10: 6 } }
    ]
  }
];

export const FLOW_BY_INTENT: Record<Exclude<CareIntent, "emergency">, AssessmentQuestion[]> = {
  symptoms: [], // filled from ASSESSMENT_FLOW in ChatApp
  refill: REFILL_FLOW,
  lab_report: LAB_REPORT_FLOW,
  nurse_care: NURSE_CARE_FLOW
};

export const INTENT_INTRO: Record<CareIntent, string> = {
  symptoms:
    "💚 I hear you — let's walk through a quick health check together. Tap an option below; your score updates after each answer.",
  refill:
    "💊 I'll help you request a medicine refill safely. A verified doctor can review your prescription and approve the refill — let's gather a few details.",
  lab_report:
    "🔬 I can connect you with a doctor to explain your lab results in plain language. Let's note which report you have and what you'd like to understand.",
  nurse_care:
    "🏠 Home nurse visits are available with verified clinicians. Tell me what kind of care you need and we'll match you with the right visit.",
  emergency: ""
};

export const INTENT_COMPLETE_SUMMARY: Record<Exclude<CareIntent, "emergency">, string> = {
  symptoms: "",
  refill: "A doctor can review your refill request and send an e-prescription if appropriate.",
  lab_report: "A doctor will walk through your report, explain key values, and suggest next steps.",
  nurse_care: "We'll arrange a qualified nurse visit at your home with doctor oversight."
};

export function defaultModeForIntent(intent: CareIntent): "video" | "home" {
  if (intent === "nurse_care") return "home";
  return "video";
}

export type SupportContext = {
  patientName?: string;
  doctorName: string;
  when: string;
  ref: string;
  feeInr?: number;
  mode: "video" | "home";
};

const GREETING_RE = /^(hi|hello|hey|hii+|namaste|good\s+(morning|afternoon|evening))[!.\s]*$/i;

export function isGreeting(text: string): boolean {
  return GREETING_RE.test(text.trim());
}

export function greetingReply(ctx: SupportContext): string {
  const first = ctx.patientName?.trim().split(/\s+/)[0];
  return first
    ? `Hello ${first}! 👋 How can I help you?`
    : `Hello! 👋 How can I help you?`;
}

export function answerSupportQuestion(text: string, ctx: SupportContext): string {
  const q = text.toLowerCase();

  if (/fee|cost|price|pay|₹|rupee|charge|how much/.test(q)) {
    const fee = ctx.feeInr != null ? `₹${ctx.feeInr}` : "as shown in your confirmation";
    const kind = ctx.mode === "home" ? "home visit" : "video consult";
    return `Your ${kind} fee is ${fee}. Payment details are shared before the visit. Ref ${ctx.ref}.`;
  }

  if (/when|time|appointment|schedule|date|slot/.test(q)) {
    return `Your appointment with ${ctx.doctorName} is on ${ctx.when}. Ref ${ctx.ref}. We'll remind you before your visit.`;
  }

  if (/reschedule|change.*time|different time|move.*appointment/.test(q)) {
    return `You can reschedule using the 📅 Reschedule button above — I'll show available slots with ${ctx.doctorName}.`;
  }

  if (/cancel|call off/.test(q)) {
    return `To cancel, tap Cancel above or message our care team. Please cancel at least 2 hours before your slot if possible.`;
  }

  if (/remind|notification|whatsapp|sms/.test(q)) {
    return `Yes — we'll send a WhatsApp reminder before your appointment on ${ctx.when}.`;
  }

  if (/prepare|bring|checklist|before visit|what should i|what to do/.test(q)) {
    return `Before your visit: keep BP readings (last 3 days), your medication strip, and a recent temperature reading handy. See the prep checklist above for more.`;
  }

  if (/who is|which doctor|doctor name|dr\.|physician/.test(q)) {
    return `You're booked with ${ctx.doctorName} on the CareConnect verified clinician network.`;
  }

  if (/video|link|join|call|meet|zoom/.test(q)) {
    return `For your video consult, we'll send a secure join link on WhatsApp about 10 minutes before ${ctx.when}.`;
  }

  if (/home|visit|address|location|come to/.test(q)) {
    return `For your home visit, keep your address ready — our team may call to confirm location before ${ctx.doctorName} arrives.`;
  }

  if (/symptom|fever|pain|worse|emergency|breathing|chest/.test(q)) {
    return `If you have severe symptoms (breathing trouble, chest pain, fainting, confusion) — call emergency services now. Otherwise ${ctx.doctorName} will assess you at your appointment on ${ctx.when}.`;
  }

  if (/thank|thanks|thank you|dhanyavad|shukriya/.test(q)) {
    return `You're welcome! Take care — ask anytime if you need help with your booking.`;
  }

  if (/help|what can you|how can you/.test(q)) {
    return `I can help with your appointment time, fee, reminders, rescheduling, or what to prepare. What would you like to know?`;
  }

  if (/ref|reference|booking id/.test(q)) {
    return `Your booking reference is ${ctx.ref} with ${ctx.doctorName} on ${ctx.when}.`;
  }

  return `I'm here to help with your booking (${ctx.ref}). Ask about your appointment time, fee, reminders, rescheduling, or how to prepare — what would you like to know?`;
}

export const SUPPORT_QUICK_TOPICS = [
  { label: "🕐 Appointment time", query: "when is my appointment" },
  { label: "💰 Fee & payment", query: "what is the consultation fee" },
  { label: "📋 What to prepare", query: "what should I prepare before visit" },
  { label: "🔔 Reminders", query: "will you send a reminder" }
] as const;

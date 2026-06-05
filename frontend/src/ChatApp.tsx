import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  createSession,
  matchDoctors,
  saveConsent,
  saveHistory,
  createBooking,
  rescheduleBooking
} from "./api/client";
import type { Doctor, TriageResult } from "./types";
import {
  ASSESSMENT_FLOW,
  formatScoreMessage,
  getScoreTier,
  type AssessmentEffects
} from "./assessment/flow";

type SelectedSlot = { atIso: string; mode: "video" | "home" };

type Step =
  | "greeting"
  | "quick_menu"
  | "symptoms"
  | "assessment"
  | "booking"
  | "history"
  | "confirm";

type Msg =
  | { id: string; from: "bot" | "user"; kind: "text"; text: string; ts: string }
  | {
      id: string;
      from: "bot";
      kind: "chips";
      text?: string;
      chips: Array<{ label: string; onPick: () => void; tone?: "primary" | "danger" }>;
      ts: string;
    }
  | {
      id: string;
      from: "bot";
      kind: "triage";
      triage: TriageResult;
      ts: string;
      onWhy: () => void;
      onProceed: () => void;
      onSelfCare: () => void;
      onEmergency: () => void;
    }
  | {
      id: string;
      from: "bot";
      kind: "doctors";
      doctors: Doctor[];
      ts: string;
      onPick: (doctorId: string) => void;
      onFilter: (patch: Partial<{ mode: "video" | "home"; gender: "female" | "male"; sortBy: string }>) => void;
    }
  | {
      id: string;
      from: "bot";
      kind: "checklist";
      title: string;
      items: Array<{ id: string; when: "now" | "before"; text: string }>;
      ts: string;
    }
  | {
      id: string;
      from: "bot";
      kind: "score";
      added: number;
      total: number;
      ts: string;
    }
  | {
      id: string;
      from: "bot";
      kind: "status";
      text: string;
      ts: string;
    };

type DistributiveOmit<T, K extends PropertyKey> = T extends any ? Omit<T, K> : never;
type NewMsg = DistributiveOmit<Msg, "id" | "ts">;

function nowTs() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}`;
}

function severityLabel(score0to100: number) {
  if (score0to100 >= 70) return { label: "High", tone: "high" as const };
  if (score0to100 >= 35) return { label: "Moderate", tone: "mod" as const };
  return { label: "Low", tone: "low" as const };
}

function formatAppointmentTime(atIso: string) {
  return new Date(atIso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

type ChatAppProps = {
  onBack?: () => void;
};

export default function ChatApp({ onBack }: ChatAppProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("greeting");
  const [messages, setMessages] = useState<Msg[]>([]);

  const [mainSymptom, setMainSymptom] = useState<string>("Fever");
  const [symptomText, setSymptomText] = useState<string>(
    "Headache + fever since yesterday, tired and mild body pain."
  );
  const [onset, setOnset] = useState<"today" | "yesterday" | "2-3days" | "1week+">("yesterday");
  const [severity0to10, setSeverity0to10] = useState<number>(6);
  const [comorbidities, setComorbidities] = useState<string[]>([]);
  const [assessmentPoints, setAssessmentPoints] = useState(0);
  const [assessmentActive, setAssessmentActive] = useState(false);
  const [redFlags, setRedFlags] = useState({
    breathingTrouble: false,
    fainting: false,
    confusion: false,
    chestPain: false,
    severeDehydration: false,
    stiffNeck: false,
    spo2Below92: false
  });

  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [mode, setMode] = useState<"video" | "home">("home");
  const [consent, setConsent] = useState<boolean | null>(null);
  const [historyText, setHistoryText] = useState<string>(
    "BP patient. Taking amlodipine 5mg. No recent tests. Star Health."
  );

  const areaRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const bootstrapped = useRef(false);
  const bookingInFlight = useRef(false);
  const historyTextRef = useRef(historyText);
  const consentRef = useRef(consent);
  const sessionIdRef = useRef<string | null>(null);
  const doctorIdRef = useRef<string | null>(null);
  const doctorsRef = useRef<Doctor[]>([]);
  const modeRef = useRef<"video" | "home">("home");
  const selectedSlotRef = useRef<SelectedSlot | null>(null);
  const bookingIdRef = useRef<string | null>(null);
  const bookingRefLabelRef = useRef<string | null>(null);
  const stepRef = useRef<Step>("greeting");
  const bookingCompleteRef = useRef(false);
  const assessmentPointsRef = useRef(0);
  const mainSymptomRef = useRef(mainSymptom);
  const onsetRef = useRef(onset);
  const severityRef = useRef(severity0to10);
  const comorbiditiesRef = useRef(comorbidities);
  const redFlagsRef = useRef(redFlags);

  useEffect(() => {
    historyTextRef.current = historyText;
  }, [historyText]);

  useEffect(() => {
    consentRef.current = consent;
  }, [consent]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    doctorIdRef.current = doctorId;
  }, [doctorId]);

  useEffect(() => {
    doctorsRef.current = doctors;
  }, [doctors]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    mainSymptomRef.current = mainSymptom;
  }, [mainSymptom]);

  useEffect(() => {
    onsetRef.current = onset;
  }, [onset]);

  useEffect(() => {
    severityRef.current = severity0to10;
  }, [severity0to10]);

  useEffect(() => {
    comorbiditiesRef.current = comorbidities;
  }, [comorbidities]);

  useEffect(() => {
    redFlagsRef.current = redFlags;
  }, [redFlags]);

  useEffect(() => {
    assessmentPointsRef.current = assessmentPoints;
  }, [assessmentPoints]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const [inputText, setInputText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookingConfirming, setBookingConfirming] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);

  useEffect(() => {
    bookingCompleteRef.current = bookingComplete;
  }, [bookingComplete]);

  const SCROLL_THRESHOLD_PX = 80;

  function isNearBottom(el: HTMLDivElement) {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD_PX;
  }

  function scrollMessagesToBottom(behavior: ScrollBehavior = "auto") {
    const el = areaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;

    const onScroll = () => {
      stickToBottomRef.current = isNearBottom(el);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollMessagesToBottom("auto");
    requestAnimationFrame(() => scrollMessagesToBottom("auto"));
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { sessionId: sid } = await createSession();
      if (!cancelled) {
        sessionIdRef.current = sid;
        setSessionId(sid);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = useMemo(
    () =>
      [
        { id: "greeting", label: "Greeting", icon: "👋", hint: "Start here" },
        { id: "quick_menu", label: "Quick menu", icon: "⚡", hint: "Pick a need" },
        { id: "symptoms", label: "Symptoms", icon: "🩺", hint: "Tell us more" },
        { id: "assessment", label: "Assessment", icon: "📊", hint: "Smart triage" },
        { id: "booking", label: "Booking", icon: "📅", hint: "Find a doctor" },
        { id: "history", label: "History", icon: "📋", hint: "Health details" },
        { id: "confirm", label: "Confirm", icon: "✓", hint: "You're set" }
      ] as const,
    []
  );

  function push(msg: NewMsg) {
    const full = { ...msg, id: uid("m"), ts: nowTs() } as Msg;
    setMessages((m) => [...m, full]);
  }

  function applyAssessmentEffects(effects?: AssessmentEffects) {
    if (!effects) return;

    if (effects.mainSymptom) {
      setMainSymptom(effects.mainSymptom);
      mainSymptomRef.current = effects.mainSymptom;
    }
    if (effects.onset) {
      setOnset(effects.onset);
      onsetRef.current = effects.onset;
    }
    if (effects.severity0to10 != null) {
      setSeverity0to10(effects.severity0to10);
      severityRef.current = effects.severity0to10;
    }
    if (effects.clearRedFlags) {
      const cleared = {
        breathingTrouble: false,
        fainting: false,
        confusion: false,
        chestPain: false,
        severeDehydration: false,
        stiffNeck: false,
        spo2Below92: false
      };
      setRedFlags(cleared);
      redFlagsRef.current = cleared;
    }
    if (effects.redFlag) {
      setRedFlags((r) => {
        const next = { ...r, [effects.redFlag!]: true };
        redFlagsRef.current = next;
        return next;
      });
    }
    if (effects.comorbidity) {
      const list =
        effects.comorbidity === "Multiple" ? ["BP", "Diabetes"] : [effects.comorbidity];
      setComorbidities(list);
      comorbiditiesRef.current = list;
    }
  }

  function askAssessmentQuestion(qIndex: number) {
    const q = ASSESSMENT_FLOW[qIndex];
    if (!q) return;

    push({
      from: "bot",
      kind: "chips",
      text: `${q.emoji} ${q.text}`,
      chips: q.options.map((opt) => ({
        label: `${opt.emoji} ${opt.label}`,
        onPick: () => processAssessmentAnswer(q.id, opt.id)
      }))
    });
  }

  function processAssessmentAnswer(questionId: string, optionId: string) {
    const q = ASSESSMENT_FLOW.find((x) => x.id === questionId);
    const opt = q?.options.find((o) => o.id === optionId);
    if (!q || !opt) return;

    push({ from: "user", kind: "text", text: `${opt.emoji} ${opt.label}` });
    applyAssessmentEffects(opt.effects);

    const newTotal = assessmentPointsRef.current + opt.points;
    assessmentPointsRef.current = newTotal;
    setAssessmentPoints(newTotal);

    window.setTimeout(() => {
      push({ from: "bot", kind: "score", added: opt.points, total: newTotal });

      const nextIndex = ASSESSMENT_FLOW.findIndex((x) => x.id === questionId) + 1;
      if (nextIndex < ASSESSMENT_FLOW.length) {
        window.setTimeout(() => askAssessmentQuestion(nextIndex), 450);
      } else {
        window.setTimeout(() => void completeConversationalAssessment(newTotal), 500);
      }
    }, 350);
  }

  async function completeConversationalAssessment(totalPoints: number) {
    setAssessmentActive(false);
    setStep("assessment");

    const hasRedFlag = Object.values(redFlagsRef.current).some(Boolean);
    const tier = getScoreTier(totalPoints, hasRedFlag);

    const symptomSummary = `${mainSymptomRef.current} since ${onsetRef.current}, severity ${severityRef.current}/10`;
    setSymptomText(symptomSummary);

    push({ from: "bot", kind: "text", text: "🔍 Reviewing your answers…" });
    await new Promise((r) => window.setTimeout(r, 700));

    push({
      from: "bot",
      kind: "text",
      text: `📊 Assessment complete — Score: ${totalPoints} pts (${tier.label} concern).\n${tier.summary}`
    });

    if (tier.videoRecommended) {
      push({
        from: "bot",
        kind: "text",
        text: "📹 Video consultation is available — speak with a verified doctor from home in ~12 minutes."
      });
      modeRef.current = "video";
      setMode("video");
    }

    await runAssessment({ skipUserEcho: true });
  }

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    push({
      from: "bot",
      kind: "chips",
      text:
        "🙏 Namaste. I'm CareConnect — here to help you feel better, safely.\n\nI'll ask a few quick questions, score your answers, and suggest the best next step.\n\nWho is this care for?",
      chips: [
        { label: "🙋 Me", onPick: () => go("quick_menu", "🙋 Me") },
        { label: "👨‍👩‍👧 Family member", onPick: () => go("quick_menu", "👨‍👩‍👧 Family member") },
        { label: "🧓 Elderly parent", onPick: () => go("quick_menu", "🧓 Elderly parent") },
        { label: "👶 Child", onPick: () => go("quick_menu", "👶 Child") }
      ]
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(next: Step, userReply?: string) {
    setStep(next);
    if (next === "quick_menu") {
      push({ from: "user", kind: "text", text: userReply ?? "Me" });
      push({
        from: "bot",
        kind: "chips",
        text: "Thanks. What would you like help with today?",
        chips: [
          { label: "🩺 I have symptoms", onPick: () => go("symptoms") },
          { label: "💊 Medicine refill", onPick: () => push({ from: "bot", kind: "text", text: "Refill flow can be added next." }) },
          { label: "🔬 Understand lab report", onPick: () => push({ from: "bot", kind: "text", text: "Lab report flow can be added next." }) },
          { label: "🏠 Home nurse care", onPick: () => push({ from: "bot", kind: "text", text: "Nurse care flow can be added next." }) },
          { label: "🚨 Emergency — call now", onPick: () => push({ from: "bot", kind: "text", text: "If this is an emergency, please call local emergency services immediately." }), tone: "danger" }
        ]
      });
    }

    if (next === "symptoms") {
      push({ from: "user", kind: "text", text: "🩺 I have symptoms" });
      setAssessmentPoints(0);
      assessmentPointsRef.current = 0;
      setAssessmentActive(true);
      setComorbidities([]);
      comorbiditiesRef.current = [];
      setRedFlags({
        breathingTrouble: false,
        fainting: false,
        confusion: false,
        chestPain: false,
        severeDehydration: false,
        stiffNeck: false,
        spo2Below92: false
      });
      redFlagsRef.current = {
        breathingTrouble: false,
        fainting: false,
        confusion: false,
        chestPain: false,
        severeDehydration: false,
        stiffNeck: false,
        spo2Below92: false
      };
      push({
        from: "bot",
        kind: "text",
        text: "💚 I hear you — let's walk through a quick health check together. Tap an option below; your score updates after each answer."
      });
      window.setTimeout(() => askAssessmentQuestion(0), 500);
    }

    if (next === "assessment") {
      void runAssessment();
    }

    if (next === "booking") {
      void runDoctorMatch();
    }
  }

  async function runAssessment(opts?: { skipUserEcho?: boolean }) {
    if (!opts?.skipUserEcho) {
      push({
        from: "user",
        kind: "text",
        text: `${mainSymptomRef.current}. Started: ${onsetRef.current}. Severity: ${severityRef.current}/10.\n${symptomText}`
      });
    }
    push({ from: "bot", kind: "text", text: "⚡ Checking the safest next step for you…" });

    const triagePayload = {
      mainSymptom: mainSymptomRef.current,
      symptomText,
      onset: onsetRef.current,
      severity0to10: severityRef.current,
      comorbidities: comorbiditiesRef.current,
      redFlags: redFlagsRef.current
    };

    const { triage } = await matchDoctors({ triage: triagePayload, preferences: { mode, sortBy: "best_fit" } });
    setTriageResult(triage);

    push({
      from: "bot",
      kind: "triage",
      triage,
      onWhy: () => {
        push({
          from: "bot",
          kind: "text",
          text: `Here’s why: \n- ${triage.reasons.join("\n- ")}`
        });
      },
      onProceed: () => go("booking"),
      onSelfCare: () =>
        push({
          from: "bot",
          kind: "text",
          text:
            "For now: rest, fluids, light meals. If fever persists beyond 48 hours, symptoms worsen, or any red flags appear, tap Emergency or book a doctor."
        }),
      onEmergency: () =>
        push({
          from: "bot",
          kind: "text",
          text:
            "If you’re experiencing severe symptoms (breathing trouble, chest pain, confusion, fainting), please call local emergency services immediately."
        })
    });

    setStep("assessment");
  }

  async function runDoctorMatch(patch?: Partial<{ mode: "video" | "home"; gender: "female" | "male"; sortBy: string }>) {
    const nextMode = patch?.mode ?? mode;
    modeRef.current = nextMode;
    setMode(nextMode);

    push({ from: "bot", kind: "text", text: "Thanks. I’ll show the best-fit doctors available today." });
    const triagePayload = {
      mainSymptom,
      symptomText,
      onset,
      severity0to10,
      comorbidities,
      redFlags
    };
    const { doctors } = await matchDoctors({
      triage: triagePayload,
      preferences: {
        mode: nextMode,
        gender: patch?.gender,
        sortBy: (patch?.sortBy as any) ?? "best_fit"
      }
    });
    doctorsRef.current = doctors;
    setDoctors(doctors);
    push({
      from: "bot",
      kind: "doctors",
      doctors,
      onPick: (id: string) => handleDoctorSelected(id, doctors),
      onFilter: (p: Partial<{ mode: "video" | "home"; gender: "female" | "male"; sortBy: string }>) =>
        void runDoctorMatch(p)
    });
    setStep("booking");
  }

  function parseApiError(err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    const parts = msg.split(":");
    return {
      status: parts[0] ?? "",
      code: parts[1] ?? "",
      message: parts.slice(2).join(":") || msg
    };
  }

  async function ensureSession(): Promise<string | null> {
    if (sessionIdRef.current) return sessionIdRef.current;
    try {
      const { sessionId: sid } = await createSession();
      sessionIdRef.current = sid;
      setSessionId(sid);
      return sid;
    } catch {
      return null;
    }
  }

  async function ensureConsentForBooking(impliedByDetails: boolean) {
    if (consentRef.current !== null) return;
    const sid = await ensureSession();
    if (!sid) return;
    const agreed = impliedByDetails;
    await saveConsent({ sessionId: sid, consentToCollectHealthInfo: agreed });
    consentRef.current = agreed;
    setConsent(agreed);
  }

  function pushConsentAndConfirmChips() {
    push({
      from: "bot",
      kind: "chips",
      chips: [
        {
          label: "I agree",
          onPick: async () => {
            const sid = sessionIdRef.current ?? (await ensureSession());
            if (!sid) return;
            await saveConsent({ sessionId: sid, consentToCollectHealthInfo: true });
            setConsent(true);
            consentRef.current = true;
            push({ from: "user", kind: "text", text: "I agree" });
            push({
              from: "bot",
              kind: "text",
              text: "Thanks. Edit your details below if needed, then tap Confirm appointment—or press send."
            });
            setStep("confirm");
            pushConfirmBookingChip();
          }
        },
        {
          label: "Skip",
          onPick: async () => {
            const sid = sessionIdRef.current ?? (await ensureSession());
            if (!sid) return;
            await saveConsent({ sessionId: sid, consentToCollectHealthInfo: false });
            setConsent(false);
            consentRef.current = false;
            push({ from: "user", kind: "text", text: "Skip" });
            setStep("confirm");
            push({
              from: "bot",
              kind: "text",
              text: "No problem—we'll book now and your doctor can gather details during the visit."
            });
            void submitHealthAndBook({ showUserHistory: false });
          }
        }
      ]
    });
  }

  function pushConfirmBookingChip() {
    push({
      from: "bot",
      kind: "chips",
      chips: [
        {
          label: "Confirm appointment ✓",
          tone: "primary",
          onPick: () => void submitHealthAndBook({ showUserHistory: true })
        }
      ]
    });
  }

  function handleDoctorSelected(id: string, doctors: Doctor[]) {
    const picked = doctors.find((d) => d.id === id);
    if (!picked) return;

    const currentStep = stepRef.current;
    const switching =
      doctorIdRef.current != null &&
      doctorIdRef.current !== id &&
      (currentStep === "history" || (currentStep === "confirm" && !bookingCompleteRef.current));

    doctorIdRef.current = id;
    setDoctorId(id);

    const visitMode = modeRef.current;
    const slot =
      (picked.nextSlots ?? []).find((s) => s.mode === visitMode) ?? picked.nextSlots?.[0];
    if (slot) {
      selectedSlotRef.current = { atIso: slot.atIso, mode: slot.mode };
      modeRef.current = slot.mode;
      setMode(slot.mode);
    }

    push({ from: "user", kind: "text", text: `Book ${picked.name}` });
    setBookingComplete(false);
    setStep("history");

    if (switching) {
      push({
        from: "bot",
        kind: "text",
        text: `Switched to ${picked.name}. Tap Confirm appointment below or press send to finish booking.`
      });
      setStep("confirm");
      if (consentRef.current !== null) {
        pushConfirmBookingChip();
      } else {
        pushConsentAndConfirmChips();
      }
      return;
    }

    push({
      from: "bot",
      kind: "text",
      text:
        "To help the doctor prepare, may I collect a few health details? You can skip anything, and we only share this with your care team."
    });
    pushConsentAndConfirmChips();
  }

  function resolveBookingSlot(picked: Doctor | undefined): SelectedSlot | null {
    if (!picked) return null;
    if (selectedSlotRef.current) {
      const stillValid = picked.nextSlots.some(
        (s) => s.atIso === selectedSlotRef.current!.atIso && s.mode === selectedSlotRef.current!.mode
      );
      if (stillValid) return selectedSlotRef.current;
    }
    const visitMode = modeRef.current;
    const slot =
      picked.nextSlots.find((s) => s.mode === visitMode) ?? picked.nextSlots[0];
    if (!slot) return null;
    selectedSlotRef.current = { atIso: slot.atIso, mode: slot.mode };
    return selectedSlotRef.current;
  }

  function pushBookingRetryChips() {
    push({
      from: "bot",
      kind: "chips",
      chips: [
        {
          label: "🔄 Try confirming again",
          tone: "primary",
          onPick: () => void submitHealthAndBook({ showUserHistory: false, isRetry: true })
        },
        {
          label: "📹 Switch to video consult",
          onPick: () => {
            modeRef.current = "video";
            setMode("video");
            selectedSlotRef.current = null;
            void submitHealthAndBook({ showUserHistory: false, isRetry: true });
          }
        },
        {
          label: "👨‍⚕️ Pick another doctor",
          onPick: () => {
            selectedSlotRef.current = null;
            setStep("booking");
            void runDoctorMatch();
          }
        }
      ]
    });
  }

  function pushPostBookingChips() {
    push({
      from: "bot",
      kind: "chips",
      chips: [
        {
          label: "Got it, thanks ✓",
          tone: "primary",
          onPick: () =>
            push({
              from: "bot",
              kind: "text",
              text: "You're all set. We'll remind you before your appointment. Take care!"
            })
        },
        { label: "📅 Reschedule", onPick: () => void startRescheduleFlow() },
        { label: "Cancel", onPick: () => push({ from: "bot", kind: "text", text: "Cancellation flow can be added next." }), tone: "danger" }
      ]
    });
  }

  function pushRescheduleFailureChips() {
    push({
      from: "bot",
      kind: "chips",
      chips: [
        {
          label: "🔄 Try reschedule again",
          tone: "primary",
          onPick: () => void startRescheduleFlow()
        },
        {
          label: "Got it",
          onPick: () =>
            push({
              from: "bot",
              kind: "text",
              text: "No worries — your original appointment is still booked. We'll remind you before your visit."
            })
        },
        { label: "Cancel", onPick: () => push({ from: "bot", kind: "text", text: "Cancellation flow can be added next." }), tone: "danger" }
      ]
    });
  }

  function startRescheduleFlow() {
    const bid = bookingIdRef.current;
    const did = doctorIdRef.current;
    const picked = doctorsRef.current.find((d) => d.id === did);

    if (!bid || !picked) {
      push({
        from: "bot",
        kind: "text",
        text: "I couldn't find your booking to reschedule. Please refresh and try booking again."
      });
      return;
    }

    const current = selectedSlotRef.current;
    const slots = picked.nextSlots.filter(
      (s) => !(s.atIso === current?.atIso && s.mode === current?.mode)
    );
    const options = slots.length > 0 ? slots : picked.nextSlots;

    push({
      from: "bot",
      kind: "text",
      text: `📅 No problem — pick a new time with ${picked.name}:`
    });

    push({
      from: "bot",
      kind: "chips",
      chips: [
        ...options.map((s) => ({
          label: `${s.mode === "home" ? "🏠" : "📹"} ${formatAppointmentTime(s.atIso)}`,
          onPick: () => void applyReschedule(s.atIso, s.mode)
        })),
        {
          label: "📹 Show video slots",
          onPick: () => void showRescheduleSlotsForMode("video")
        },
        {
          label: "🏠 Show home visit slots",
          onPick: () => void showRescheduleSlotsForMode("home")
        }
      ]
    });
  }

  function showRescheduleSlotsForMode(visitMode: "video" | "home") {
    const did = doctorIdRef.current;
    const picked = doctorsRef.current.find((d) => d.id === did);
    if (!picked) return;

    const slots = picked.nextSlots.filter((s) => s.mode === visitMode);
    if (slots.length === 0) {
      push({
        from: "bot",
        kind: "text",
        text: `No ${visitMode === "home" ? "home visit" : "video"} slots available right now. Try the other visit type.`
      });
      return;
    }

    push({
      from: "bot",
      kind: "chips",
      chips: slots.map((s) => ({
        label: `${s.mode === "home" ? "🏠" : "📹"} ${formatAppointmentTime(s.atIso)}`,
        onPick: () => void applyReschedule(s.atIso, s.mode)
      }))
    });
  }

  async function recoverRescheduleViaRebook(
    slotAtIso: string,
    visitMode: "video" | "home",
    picked: Doctor
  ): Promise<boolean> {
    const did = doctorIdRef.current;
    if (!did) return false;

    const sid = await ensureSession();
    if (!sid) return false;

    const res = await createBooking({
      sessionId: sid,
      doctorId: did,
      slotAtIso,
      mode: visitMode,
      patient: { name: "Ravi K." }
    });

    const ref = `CC-${res.booking.id.toUpperCase()}`;
    bookingIdRef.current = res.booking.id;
    bookingRefLabelRef.current = ref;
    selectedSlotRef.current = { atIso: res.booking.slotAtIso, mode: res.booking.mode };
    modeRef.current = res.booking.mode;
    setMode(res.booking.mode);

    const modeLabel = res.booking.mode === "home" ? "Home visit" : "Video consult";
    const when = formatAppointmentTime(res.booking.slotAtIso);

    push({
      from: "bot",
      kind: "text",
      text: `✅ Rescheduled! ${picked.name} • ${modeLabel} • ${when} • Ref ${ref} • Fee ₹${picked.price[res.booking.mode]}`
    });
    pushPostBookingChips();
    return true;
  }

  async function applyReschedule(slotAtIso: string, visitMode: "video" | "home") {
    const bid = bookingIdRef.current;
    const did = doctorIdRef.current;
    const picked = doctorsRef.current.find((d) => d.id === did);

    if (!bid || !picked) return;

    const label = `${visitMode === "home" ? "🏠" : "📹"} ${formatAppointmentTime(slotAtIso)}`;
    push({ from: "user", kind: "text", text: `Reschedule to ${label}` });
    push({ from: "bot", kind: "status", text: "⏳ Updating your appointment…" });

    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await rescheduleBooking(bid, { slotAtIso, mode: visitMode });
        selectedSlotRef.current = { atIso: res.booking.slotAtIso, mode: res.booking.mode };
        modeRef.current = res.booking.mode;
        setMode(res.booking.mode);

        const ref = bookingRefLabelRef.current ?? `CC-${bid.toUpperCase()}`;
        const modeLabel = res.booking.mode === "home" ? "Home visit" : "Video consult";
        const when = formatAppointmentTime(res.booking.slotAtIso);

        push({
          from: "bot",
          kind: "text",
          text: `✅ Rescheduled! ${picked.name} • ${modeLabel} • ${when} • Ref ${ref} • Fee ₹${picked.price[res.booking.mode]}`
        });
        pushPostBookingChips();
        return;
      } catch (err) {
        const { code, message } = parseApiError(err);
        const isNetwork =
          err instanceof TypeError ||
          message.includes("Failed to fetch") ||
          message.includes("NetworkError");

        if (code === "booking_not_found") {
          try {
            if (await recoverRescheduleViaRebook(slotAtIso, visitMode, picked)) return;
          } catch {
            // fall through to user-facing error
          }
        }

        if (isNetwork && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }

        push({
          from: "bot",
          kind: "text",
          text: isNetwork
            ? "Can't reach the server to reschedule. Make sure the backend is running (`npm run dev` in the backend folder), then tap Try reschedule again."
            : code === "slot_unavailable"
              ? "That slot isn't available. Please pick another time."
              : code === "booking_not_found"
                ? "I couldn't find your booking on the server (it may have reset). Tap Try reschedule again to book the new time."
                : "Couldn't reschedule right now. Tap Try reschedule again."
        });
        pushRescheduleFailureChips();
        return;
      }
    }
  }

  function pushBookingSuccess(
    picked: Doctor,
    slot: SelectedSlot,
    ref: string,
    checklist: Array<{ id: string; when: "now" | "before"; text: string }>
  ) {
    const modeLabel = slot.mode === "home" ? "Home visit" : "Video consult";
    const when = formatAppointmentTime(slot.atIso);

    setStep("confirm");
    setBookingComplete(true);

    push({
      from: "bot",
      kind: "text",
      text: `✅ Booking confirmed! ${picked.name} • ${modeLabel} • ${when} • Ref ${ref} • Fee ₹${picked.price[slot.mode]}`
    });
    push({
      from: "bot",
      kind: "text",
      text: "You'll get doctor details and reminders here. Here's a quick prep checklist before your visit."
    });
    push({
      from: "bot",
      kind: "checklist",
      title: "Care prep checklist",
      items: checklist
    });
    pushPostBookingChips();
  }

  async function attemptBooking(detailsText: string): Promise<boolean> {
    const sid = await ensureSession();
    const did = doctorIdRef.current;

    if (!sid) {
      push({
        from: "bot",
        kind: "text",
        text: "Session not ready—please refresh the page and try again."
      });
      return false;
    }

    if (!did) {
      push({
        from: "bot",
        kind: "text",
        text: "Please pick a doctor first, then confirm your booking."
      });
      pushBookingRetryChips();
      return false;
    }

    const picked = doctorsRef.current.find((d) => d.id === did);
    const slot = resolveBookingSlot(picked);
    if (!picked || !slot) {
      push({
        from: "bot",
        kind: "text",
        text: "That time slot is no longer available. Try another doctor or visit mode."
      });
      pushBookingRetryChips();
      return false;
    }

    if (consentRef.current === true && detailsText.trim()) {
      try {
        await saveHistory({
          sessionId: sid,
          conditions: detailsText.toLowerCase().includes("bp") ? ["BP"] : [],
          meds: detailsText.toLowerCase().includes("amlodipine") ? ["Amlodipine 5mg"] : [],
          insuranceProvider: detailsText.toLowerCase().includes("star") ? "Star Health" : undefined
        });
      } catch (err) {
        const { code } = parseApiError(err);
        if (code === "session_not_found") {
          const newSid = await ensureSession();
          if (!newSid) throw err;
          await saveConsent({ sessionId: newSid, consentToCollectHealthInfo: true });
          consentRef.current = true;
          await saveHistory({
            sessionId: newSid,
            conditions: detailsText.toLowerCase().includes("bp") ? ["BP"] : [],
            meds: detailsText.toLowerCase().includes("amlodipine") ? ["Amlodipine 5mg"] : [],
            insuranceProvider: detailsText.toLowerCase().includes("star") ? "Star Health" : undefined
          });
        } else {
          push({
            from: "bot",
            kind: "text",
            text: "Note: health details couldn't be saved, but I'll still confirm your appointment."
          });
        }
      }
    }

    const res = await createBooking({
      sessionId: sid,
      doctorId: did,
      slotAtIso: slot.atIso,
      mode: slot.mode,
      patient: { name: "Ravi K." }
    });

    const ref = `CC-${res.booking.id.toUpperCase()}`;
    bookingIdRef.current = res.booking.id;
    bookingRefLabelRef.current = ref;
    selectedSlotRef.current = { atIso: res.booking.slotAtIso, mode: res.booking.mode };
    pushBookingSuccess(picked, { atIso: res.booking.slotAtIso, mode: res.booking.mode }, ref, res.checklist);
    return true;
  }

  async function finalizeBooking(detailsText: string): Promise<boolean> {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await attemptBooking(detailsText);
      } catch (err) {
        const { status, code, message } = parseApiError(err);
        const isNetwork = message.includes("Failed to fetch") || message.includes("NetworkError");
        const isSession = code === "session_not_found" || status === "404";
        const isSlot = code === "slot_unavailable" || status === "409";
        const isValidation = code === "invalid_request" || status === "400";

        if (isSession && attempt < maxAttempts) {
          sessionIdRef.current = null;
          setSessionId(null);
          await ensureSession();
          if (consentRef.current === true) {
            const sid = sessionIdRef.current;
            if (sid) await saveConsent({ sessionId: sid, consentToCollectHealthInfo: true });
          }
          continue;
        }

        if (isSlot) {
          selectedSlotRef.current = null;
          if (attempt < maxAttempts) continue;
        }

        push({
          from: "bot",
          kind: "text",
          text: isNetwork
            ? "Can't reach the server—make sure the backend is running (`npm run dev` in the backend folder), then tap Try again."
            : isSession
              ? "Your session expired. Tap Try again — I'll reconnect and finish your booking."
              : isSlot
                ? "That appointment slot was just taken. Tap Switch to video or Pick another doctor."
                : isValidation
                  ? "We couldn't validate the booking details. Tap Try again — if this keeps happening, refresh the page and restart from the doctor list."
                  : "Something went wrong while confirming. Tap Try again — your details are saved."
        });
        pushBookingRetryChips();
        return false;
      }
    }

    return false;
  }

  async function submitHealthAndBook(opts?: { showUserHistory?: boolean; isRetry?: boolean }) {
    if (bookingInFlight.current) return;

    const details = historyTextRef.current.trim();
    const showUserHistory = opts?.showUserHistory ?? true;

    if (!doctorIdRef.current) {
      push({
        from: "bot",
        kind: "text",
        text: "Please pick a doctor first, then confirm your appointment."
      });
      return;
    }

    const sid = await ensureSession();
    if (!sid) {
      push({
        from: "bot",
        kind: "text",
        text: "Can't connect to CareConnect right now. Start the backend server, refresh the page, and try again."
      });
      return;
    }

    try {
      await ensureConsentForBooking(showUserHistory && details.length > 0);
    } catch {
      push({
        from: "bot",
        kind: "text",
        text: "Couldn't save your consent preference, but I'll still try to confirm your appointment."
      });
    }

    bookingInFlight.current = true;
    setBookingConfirming(true);
    setStep("confirm");

    try {
      if (showUserHistory && details) {
        push({ from: "user", kind: "text", text: details });
      }

      const docName =
        doctorsRef.current.find((d) => d.id === doctorIdRef.current)?.name ?? "your doctor";

      if (!opts?.isRetry) {
        push({
          from: "bot",
          kind: "status",
          text: `⏳ Securing your appointment with ${docName}…`
        });
      } else {
        push({
          from: "bot",
          kind: "status",
          text: "⏳ Retrying confirmation…"
        });
      }

      await finalizeBooking(details);
    } finally {
      bookingInFlight.current = false;
      setBookingConfirming(false);
    }
  }

  const triageBadge = triageResult ? severityLabel(triageResult.score0to100) : null;
  const stepIndex = steps.findIndex((s) => s.id === step);
  const currentStep = steps[stepIndex];
  const progressPct = ((stepIndex + 1) / steps.length) * 100;

  return (
    <div className="page">
      <div
        className={`shell ${sidebarOpen ? "sidebar-open" : ""}`}
        role="application"
        aria-label="CareConnect chat"
      >
        {sidebarOpen ? (
          <button
            className="sidebarBackdrop"
            type="button"
            aria-label="Close chats panel"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <aside
          id="chat-sidebar"
          className="sidebar"
          aria-label="Chats"
          aria-hidden={!sidebarOpen}
        >
          <div className="brand">
            {onBack ? (
              <button className="backLink" type="button" onClick={onBack}>
                ← Back to home
              </button>
            ) : null}
            <div className="brandRow">
              <div className="brandLogo">CC</div>
              <div>
                <div className="brandName">CareConnect</div>
                <div className="brandSub">Home Health Bot</div>
              </div>
            </div>
            <p className="brandTagline">Safe triage • Verified doctors • Home care</p>
          </div>
          <button className="chatRow active" type="button">
            <div className="avatar cc">RK</div>
            <div className="chatMeta">
              <div className="chatName">Ravi K.</div>
              <div className="chatPreview">Feeling a bit unwell…</div>
            </div>
          </button>
          <button className="chatRow" type="button">
            <div className="avatar sp">SP</div>
            <div className="chatMeta">
              <div className="chatName">Sunita P.</div>
              <div className="chatPreview">Medicine refill request</div>
            </div>
          </button>
          <button className="chatRow" type="button">
            <div className="avatar am">AM</div>
            <div className="chatMeta">
              <div className="chatName">Ananya M.</div>
              <div className="chatPreview">Post-surgery nurse care</div>
            </div>
          </button>
          <div className="flow">
            <div className="flowLabel">Flow preview</div>
            <div className="flowValue">
              <span className="flowStepIcon" aria-hidden="true">{currentStep?.icon}</span>
              Step {stepIndex + 1} of {steps.length}
              {triageBadge ? (
                <span className={`miniBadge ${triageBadge.tone}`}>{triageBadge.label}</span>
              ) : null}
            </div>
            <p className="flowHint">{currentStep?.hint}</p>
          </div>
        </aside>

        <main className="chat" aria-label="Conversation">
          <header className="chatHeader">
            <button
              className={`iconBtn sidebarToggle ${sidebarOpen ? "active" : ""}`}
              type="button"
              aria-label={sidebarOpen ? "Hide chats panel" : "Show chats panel"}
              aria-expanded={sidebarOpen}
              aria-controls="chat-sidebar"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 6h16M4 12h16M4 18h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="avatar bot ring">CC</div>
            <div className="headerText">
              <div className="headerNameRow">
                <span className="headerName">CareConnect Health</span>
                <span className="headerLive">
                  <span className="liveDot" aria-hidden="true" />
                  Live
                </span>
              </div>
              <div className="headerSub">
                <span className="trustBadge">
                  <span className="verified">✓</span>
                  Verified clinician network
                </span>
                {!sidebarOpen ? (
                  <span className="headerFlow">
                    <span className="headerFlowIcon" aria-hidden="true">{currentStep?.icon}</span>
                    Step {stepIndex + 1}/{steps.length}
                    <span className="headerFlowHint">{currentStep?.hint}</span>
                    {assessmentPoints > 0 ? (
                      <span className="scoreBadge">📊 {assessmentPoints} pts</span>
                    ) : null}
                    {triageBadge ? (
                      <span className={`miniBadge ${triageBadge.tone}`}>{triageBadge.label}</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="headerActions">
              <button className="iconBtn" type="button" aria-label="Call">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6.6 10.8c1.5 2.9 3.7 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="currentColor"/>
                </svg>
              </button>
              <button className="iconBtn" type="button" aria-label="Menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                </svg>
              </button>
            </div>
          </header>

          <div className="valueStrip" role="region" aria-label="CareConnect benefits">
            <span className="valuePill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2l7 4v6c0 5-3.5 9.5-7 10-3.5-.5-7-5-7-10V6l7-4z" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Clinically guided triage
            </span>
            <span className="valuePill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Avg. 12 min to doctor match
            </span>
            <span className="valuePill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 10.5L12 4l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              Home visits &amp; video consults
            </span>
          </div>

          <nav className="stepProgress" aria-label="Steps">
            <div className="stepProgressInner">
              <div className="progressMeta">
                <span className="progressLabel">Your care journey</span>
                <span className="progressPct">{Math.round(progressPct)}% complete</span>
              </div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="stepTabs">
                {steps.map((s, i) => (
                  <span
                    key={s.id}
                    className={`tab ${s.id === step ? "active" : ""} ${i < stepIndex ? "done" : ""}`}
                    title={s.hint}
                  >
                    <span className="tabIcon" aria-hidden="true">{s.icon}</span>
                    <span className="tabLabel">{s.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </nav>

          <div className="messages" ref={areaRef}>
            <div className="messagesInner">
              {messages.map((m) => (
                <Message key={m.id} msg={m} />
              ))}
            </div>
          </div>

          <footer className="composer" aria-label="Composer">
            <div className="composerInner">
            {step === "symptoms" && assessmentActive ? (
              <div className="assessmentHint">
                <span className="assessmentHintIcon" aria-hidden="true">📊</span>
                Tap an option above to answer — score: <strong>{assessmentPoints} pts</strong>
              </div>
            ) : step === "history" || (step === "confirm" && !bookingComplete) ? (
              <div className="historyPanel">
                {bookingConfirming ? (
                  <div className="confirmingBar" aria-live="polite">
                    <span className="confirmingSpinner" aria-hidden="true" />
                    Confirming your booking…
                  </div>
                ) : (
                  <p className="historyHint">
                    {doctorId
                      ? `Booking ${doctors.find((d) => d.id === doctorId)?.name ?? "your doctor"} — tap Confirm or press send ↵`
                      : "Pick a doctor above, then confirm here"}
                  </p>
                )}
                <div className="historyRow">
                  <input
                    className="textInput"
                    value={historyText}
                    onChange={(e) => setHistoryText(e.target.value)}
                    placeholder="Type conditions, medicines, tests, insurance…"
                    disabled={bookingConfirming}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !bookingConfirming) {
                        e.preventDefault();
                        void submitHealthAndBook({ showUserHistory: true });
                      }
                    }}
                  />
                  <button
                    className={`sendBtn ${bookingConfirming ? "loading" : ""}`}
                    type="button"
                    disabled={bookingConfirming}
                    onClick={() => void submitHealthAndBook({ showUserHistory: true })}
                    aria-label="Send and confirm booking"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                    </svg>
                  </button>
                  <button
                    className="btn primary confirmApptBtn"
                    type="button"
                    disabled={bookingConfirming || !doctorId}
                    onClick={() => void submitHealthAndBook({ showUserHistory: true })}
                  >
                    Confirm appointment ✓
                  </button>
                </div>
              </div>
            ) : (
              <div className="inputBar">
                <button className="inputIcon" type="button" aria-label="Emoji">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M9 10h.01M15 10h.01M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <input
                  className="waInput"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    step === "greeting" || (step === "symptoms" && assessmentActive)
                      ? "Tap an option above to continue…"
                      : step === "assessment" && triageResult
                        ? "Tap “Book a doctor” above, or type here…"
                        : "Type a message…"
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inputText.trim()) {
                      push({ from: "user", kind: "text", text: inputText.trim() });
                      setInputText("");
                    }
                  }}
                />
                {step === "assessment" && triageResult ? (
                  <button className="sendBtn" type="button" onClick={() => go("booking")} aria-label="See doctors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                    </svg>
                  </button>
                ) : (
                  <button
                    className="sendBtn"
                    type="button"
                    aria-label="Send"
                    onClick={() => {
                      if (!inputText.trim()) return;
                      push({ from: "user", kind: "text", text: inputText.trim() });
                      setInputText("");
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                    </svg>
                  </button>
                )}
              </div>
            )}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Message({ msg }: { msg: Msg }) {
  const isBot = msg.from === "bot";
  const align = isBot ? "left" : "right";

  if (msg.kind === "status") {
    return (
      <div className="wrap left animate-in">
        <div className="bubble bot statusBubble">
          <span className="statusPulse" aria-hidden="true" />
          <span>{msg.text}</span>
          <div className="time">{msg.ts}</div>
        </div>
      </div>
    );
  }

  if (msg.kind === "score") {
    return (
      <div className="wrap left animate-in">
        <div className="bubble bot scoreBubble">
          <span className="scoreBubbleIcon" aria-hidden="true">📊</span>
          <span>{formatScoreMessage(msg.added, msg.total)}</span>
          <div className="time">{msg.ts}</div>
        </div>
      </div>
    );
  }

  if (msg.kind === "chips") {
    return (
      <div className={`wrap ${align} animate-in`}>
        <div className={`bubble bot ${msg.text ? "" : "chips-only"}`}>
          {msg.text ? <div className="text">{msg.text}</div> : null}
          <div className="chips">
            {msg.chips.map((c) => (
              <button
                key={c.label}
                type="button"
                className={`chip ${c.tone ?? "default"}`}
                onClick={c.onPick}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="time">{msg.ts}</div>
        </div>
      </div>
    );
  }

  if (msg.kind === "triage") {
    const b = severityLabel(msg.triage.score0to100);
    return (
      <div className="wrap left animate-in wide">
        <div className="bubble bot card">
          <div className="cardTop">
            <div className="cardTitle">Triage: {b.label}</div>
            <div className={`pill ${b.tone}`}>{msg.triage.score0to100}/100</div>
          </div>
          <div className="cardBody">
            {msg.triage.redFlagTriggered ? (
              <div className="warn">
                One or more red flags may be present. Please seek urgent help.
              </div>
            ) : (
              <div className="ok">
                Recommended:{" "}
                <strong>
                  {msg.triage.recommendedNextStep === "self_care"
                    ? "Self-care with monitoring"
                    : "Doctor consult"}
                </strong>
              </div>
            )}
            <div className="oneLiner">{msg.triage.summaryForDoctor.oneLiner}</div>
          </div>
          <div className="cardActions">
            <button className="chip default" type="button" onClick={msg.onWhy}>
              Why?
            </button>
            <button className="chip default" type="button" onClick={msg.onSelfCare}>
              Self-care tips
            </button>
            <button className="chip primary" type="button" onClick={msg.onProceed}>
              Book a doctor
            </button>
            <button className="chip danger" type="button" onClick={msg.onEmergency}>
              Emergency
            </button>
          </div>
          <div className="time">{msg.ts}</div>
        </div>
      </div>
    );
  }

  if (msg.kind === "doctors") {
    return (
      <div className="wrap left animate-in wide">
        <div className="bubble bot card">
          <div className="cardTop">
            <div className="cardTitle">Available doctors</div>
            <div className="filters">
              <button className="chip default" type="button" onClick={() => msg.onFilter({ mode: "video" })}>
                Video
              </button>
              <button className="chip default" type="button" onClick={() => msg.onFilter({ mode: "home" })}>
                Home visit
              </button>
              <button className="chip default" type="button" onClick={() => msg.onFilter({ gender: "female" })}>
                Female
              </button>
              <button className="chip default" type="button" onClick={() => msg.onFilter({ sortBy: "soonest" })}>
                Soonest
              </button>
            </div>
          </div>

          <div className="doctorList">
            {msg.doctors.slice(0, 3).map((d) => (
              <button key={d.id} className="doctorCard" type="button" onClick={() => msg.onPick(d.id)}>
                <div className="doctorTop">
                  <div className="doctorName">{d.name}</div>
                  <div className="doctorTag">{d.match?.label ?? "Match"}</div>
                </div>
                <div className="doctorSub">
                  <span>{d.specialties[0]}</span>
                  <span className="dot">•</span>
                  <span>⭐ {d.rating.toFixed(1)} ({d.reviewCount})</span>
                  <span className="dot">•</span>
                  <span>{d.yearsExp} yrs</span>
                </div>
                <div className="doctorChips">
                  {d.badges.slice(0, 2).map((b) => (
                    <span key={b} className="miniPill">
                      {b}
                    </span>
                  ))}
                </div>
                <div className="doctorBottom">
                  <div className="doctorPrice">₹{d.price.video} video • ₹{d.price.home} home</div>
                  <div className="doctorRt">Replies ~{d.responseTimeMinsP50}m</div>
                </div>
              </button>
            ))}
          </div>
          <div className="time">{msg.ts}</div>
        </div>
      </div>
    );
  }

  if (msg.kind === "checklist") {
    return (
      <div className="wrap left animate-in wide">
        <div className="bubble bot card">
          <div className="cardTitle">{msg.title}</div>
          <div className="checklist">
            {msg.items.map((it) => (
              <label key={it.id} className="checkItem">
                <input type="checkbox" />
                <span className={`when ${it.when}`}>{it.when === "now" ? "Now" : "Before visit"}</span>
                <span className="checkText">{it.text}</span>
              </label>
            ))}
          </div>
          <div className="time">{msg.ts}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`wrap ${align} animate-in`}>
      <div className={`bubble ${isBot ? "bot" : "user"}`}>
        <div className="text">{msg.text}</div>
        <div className="time">{msg.ts}</div>
      </div>
    </div>
  );
}

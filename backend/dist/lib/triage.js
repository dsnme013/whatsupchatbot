function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
function onsetWeight(onset) {
    switch (onset) {
        case "today":
            return 6;
        case "yesterday":
            return 10;
        case "2-3days":
            return 14;
        case "1week+":
            return 18;
    }
}
export function triage(input) {
    const severityPart = clamp(input.severity0to10, 0, 10) * 5.5; // 0..55
    const onsetPart = onsetWeight(input.onset); // 6..18
    const agePart = input.age == null
        ? 0
        : input.age >= 65
            ? 10
            : input.age <= 12
                ? 6
                : 0;
    const comorbPart = clamp((input.comorbidities?.length ?? 0) * 4, 0, 12);
    const redFlags = input.redFlags ?? {};
    const redFlagTriggered = Boolean(redFlags.breathingTrouble ||
        redFlags.fainting ||
        redFlags.confusion ||
        redFlags.chestPain ||
        redFlags.spo2Below92 ||
        redFlags.severeDehydration ||
        redFlags.stiffNeck);
    const redFlagPart = redFlagTriggered ? 35 : 0;
    const base = severityPart + onsetPart + agePart + comorbPart + redFlagPart;
    const score0to100 = clamp(Math.round(base), 0, 100);
    let severity = "low";
    if (score0to100 >= 70)
        severity = "high";
    else if (score0to100 >= 35)
        severity = "moderate";
    const reasons = [];
    reasons.push(`Severity reported: ${clamp(input.severity0to10, 0, 10)}/10`);
    reasons.push(`Onset: ${input.onset === "2-3days"
        ? "2–3 days"
        : input.onset === "1week+"
            ? "1 week+"
            : input.onset}`);
    if (input.age != null)
        reasons.push(`Age: ${input.age}`);
    if ((input.comorbidities?.length ?? 0) > 0)
        reasons.push(`Comorbidities: ${input.comorbidities.join(", ")}`);
    if (redFlagTriggered)
        reasons.push("One or more red-flag symptoms");
    const recommendedNextStep = redFlagTriggered
        ? "urgent_human_help"
        : severity === "high"
            ? "doctor_consult_recommended"
            : severity === "moderate"
                ? "doctor_consult_recommended"
                : "self_care";
    const main = input.mainSymptom.trim() || "symptoms";
    const oneLiner = `${main} since ${input.onset === "2-3days" ? "2–3 days" : input.onset === "1week+" ? "1+ week" : input.onset}, severity ${clamp(input.severity0to10, 0, 10)}/10.`;
    const bullets = [
        input.symptomText ? `User description: ${input.symptomText}` : undefined,
        (input.comorbidities?.length ?? 0) ? `Known conditions: ${input.comorbidities.join(", ")}` : undefined,
        redFlagTriggered ? "Red flags present (needs urgent evaluation)" : undefined
    ].filter(Boolean);
    return {
        score0to100,
        severity,
        recommendedNextStep,
        reasons,
        redFlagTriggered,
        summaryForDoctor: { oneLiner, bullets }
    };
}

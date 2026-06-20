import { doctors } from "../data/doctors.js";
import { getDashboardProfileSync } from "../db/profileState.js";

/** Doctor console account — dashboard Settings fees always win for this doctor. */
export const CONSOLE_DOCTOR_ID = "doc_arjun_mehta";

function profileFee(mode: "video" | "home"): number {
  const profile = getDashboardProfileSync();
  const raw = mode === "home" ? profile.home_fee : profile.fee;
  const fee = Number(raw);
  return Number.isFinite(fee) && fee >= 0 ? fee : 0;
}

/** Live fee: dashboard Settings for console doctor; catalog for others. */
export function resolveConsultationFee(doctorId: string, mode: "video" | "home"): number {
  if (doctorId === CONSOLE_DOCTOR_ID) return profileFee(mode);
  const doc = doctors.find((d) => d.id === doctorId);
  if (doc) return doc.price[mode];
  return profileFee(mode);
}

export function applyLivePrices<T extends { id: string; price: { video: number; home: number } }>(
  doc: T
): T {
  return {
    ...doc,
    price: {
      video: resolveConsultationFee(doc.id, "video"),
      home: resolveConsultationFee(doc.id, "home")
    }
  };
}

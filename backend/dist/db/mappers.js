export const DEFAULT_PROFILE = {
    name: "Dr. Arjun Mehta",
    speciality: "General Physician",
    fee: 499,
    home_fee: 799,
    languages: "English, Hindi",
    bio: "15+ years in family medicine. Calm, thorough, and focused on practical home-care advice.",
    accept_video: true,
    accept_home_visits: true,
    auto_accept_low: false,
    whatsapp_notifications: true
};
export function rowToSession(row) {
    return {
        sessionId: row.sessionId,
        createdAtIso: row.createdAt.toISOString(),
        consentToCollectHealthInfo: row.consentToCollectHealthInfo ?? undefined,
        triageInput: row.triageInput ?? undefined,
        triage: row.triage ?? undefined,
        history: row.history ?? undefined
    };
}
export function rowToBooking(row) {
    return {
        id: row.id,
        sessionId: row.sessionId,
        createdAtIso: row.createdAt.toISOString(),
        doctorId: row.doctorId,
        slotAtIso: row.slotAtIso.toISOString(),
        mode: row.mode,
        feeInr: row.feeInr ?? undefined,
        status: row.status,
        acceptedAtIso: row.acceptedAtIso?.toISOString(),
        approvalMessage: row.approvalMessage ?? undefined,
        rescheduledAtIso: row.rescheduledAtIso?.toISOString(),
        rescheduleMessage: row.rescheduleMessage ?? undefined,
        patient: {
            name: row.patientName,
            age: row.patientAge ?? undefined,
            gender: row.patientGender ?? undefined,
            phone: row.patientPhone ?? undefined,
            address: row.patientAddress ?? undefined,
            city: row.patientCity ?? undefined,
            village: row.patientVillage ?? undefined,
            pincode: row.patientPincode ?? undefined,
            house_number: row.patientHouseNumber ?? undefined
        }
    };
}
export function bookingToRowData(booking) {
    return {
        sessionId: booking.sessionId,
        doctorId: booking.doctorId,
        slotAtIso: new Date(booking.slotAtIso),
        mode: booking.mode,
        feeInr: booking.feeInr ?? null,
        status: booking.status ?? "pending",
        acceptedAtIso: booking.acceptedAtIso ? new Date(booking.acceptedAtIso) : null,
        approvalMessage: booking.approvalMessage ?? null,
        rescheduledAtIso: booking.rescheduledAtIso ? new Date(booking.rescheduledAtIso) : null,
        rescheduleMessage: booking.rescheduleMessage ?? null,
        patientName: booking.patient.name,
        patientAge: booking.patient.age ?? null,
        patientGender: booking.patient.gender ?? null,
        patientPhone: booking.patient.phone ?? null,
        patientAddress: booking.patient.address ?? null,
        patientCity: booking.patient.city ?? null,
        patientVillage: booking.patient.village ?? null,
        patientPincode: booking.patient.pincode ?? null,
        patientHouseNumber: booking.patient.house_number ?? null
    };
}
export function rowToDashboardPatient(row) {
    return {
        id: row.id,
        name: row.name,
        age: row.age,
        gender: row.gender,
        symptom: row.symptom,
        onset: row.onset,
        score: row.score,
        tier: row.tier,
        flags: row.flags,
        comorb: row.comorb,
        mode: row.mode,
        time: row.time,
        color: row.color,
        status: row.status,
        fee: row.fee
    };
}
export function rowToProfile(row) {
    return {
        name: row.name,
        speciality: row.speciality,
        fee: row.fee,
        home_fee: row.homeFee,
        languages: row.languages,
        bio: row.bio,
        accept_video: row.acceptVideo,
        accept_home_visits: row.acceptHomeVisits,
        auto_accept_low: row.autoAcceptLow,
        whatsapp_notifications: row.whatsappNotifications
    };
}
export function profileToRowData(patch) {
    return {
        ...(patch.name != null ? { name: patch.name } : {}),
        ...(patch.speciality != null ? { speciality: patch.speciality } : {}),
        ...(patch.fee != null ? { fee: patch.fee } : {}),
        ...(patch.home_fee != null ? { homeFee: patch.home_fee } : {}),
        ...(patch.languages != null ? { languages: patch.languages } : {}),
        ...(patch.bio != null ? { bio: patch.bio } : {}),
        ...(patch.accept_video != null ? { acceptVideo: patch.accept_video } : {}),
        ...(patch.accept_home_visits != null ? { acceptHomeVisits: patch.accept_home_visits } : {}),
        ...(patch.auto_accept_low != null ? { autoAcceptLow: patch.auto_accept_low } : {}),
        ...(patch.whatsapp_notifications != null
            ? { whatsappNotifications: patch.whatsapp_notifications }
            : {})
    };
}
export function rowToThread(row) {
    return {
        patient_id: row.patientId,
        unread: row.unread,
        msgs: row.messages
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((m) => ({ who: m.who, t: m.t, txt: m.txt }))
    };
}
export function parseScheduleJson(json) {
    if (!Array.isArray(json))
        return [];
    return json;
}
export function parseOpenSlotsJson(json) {
    if (!Array.isArray(json))
        return [];
    return json.filter((x) => typeof x === "string");
}

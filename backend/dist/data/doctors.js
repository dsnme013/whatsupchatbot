function todayAt(hours, minutes) {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    if (d.getTime() < Date.now()) {
        d.setDate(d.getDate() + 1);
    }
    return d.toISOString();
}
export const doctors = [
    {
        id: "doc_arjun_mehta",
        name: "Dr. Arjun Mehta",
        gender: "male",
        specialties: ["General Physician", "Fever & Infection"],
        yearsExp: 12,
        rating: 4.9,
        reviewCount: 47,
        languages: ["English", "Hindi"],
        badges: ["Most booked this week", "Great bedside manner"],
        responseTimeMinsP50: 8,
        price: { video: 499, home: 799 },
        nextSlots: [
            { atIso: todayAt(16, 0), mode: "home" },
            { atIso: todayAt(18, 30), mode: "video" }
        ],
        highlights: [
            "Explains clearly and calmly",
            "Strong experience with seasonal fevers"
        ]
    },
    {
        id: "doc_priya_nair",
        name: "Dr. Priya Nair",
        gender: "female",
        specialties: ["Internal Medicine", "Chronic Conditions"],
        yearsExp: 9,
        rating: 4.8,
        reviewCount: 38,
        languages: ["English", "Tamil", "Hindi"],
        badges: ["Best for BP/Diabetes", "Thorough evaluator"],
        responseTimeMinsP50: 12,
        price: { video: 599, home: 899 },
        nextSlots: [
            { atIso: todayAt(17, 0), mode: "video" },
            { atIso: todayAt(19, 0), mode: "home" }
        ],
        highlights: [
            "Very systematic assessment",
            "Great for comorbidities like BP"
        ]
    },
    {
        id: "doc_sara_khan",
        name: "Dr. Sara Khan",
        gender: "female",
        specialties: ["General Physician", "Headache & Migraine"],
        yearsExp: 7,
        rating: 4.7,
        reviewCount: 64,
        languages: ["English", "Hindi", "Urdu"],
        badges: ["Fastest availability", "Gentle approach"],
        responseTimeMinsP50: 6,
        price: { video: 449, home: 749 },
        nextSlots: [
            { atIso: todayAt(15, 30), mode: "video" },
            { atIso: todayAt(16, 30), mode: "home" }
        ],
        highlights: ["Quick, practical guidance", "Good with anxiety around symptoms"]
    }
];

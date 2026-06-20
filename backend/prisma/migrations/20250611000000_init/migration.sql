-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "sessions" (
    "session_id" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consent_collect" BOOLEAN,
    "triage_input" JSONB,
    "triage" JSONB,
    "history" JSONB,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" VARCHAR(20) NOT NULL,
    "session_id" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doctor_id" VARCHAR(80) NOT NULL,
    "slot_at" TIMESTAMPTZ(6) NOT NULL,
    "mode" VARCHAR(10) NOT NULL,
    "fee_inr" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "accepted_at" TIMESTAMPTZ(6),
    "approval_message" TEXT,
    "rescheduled_at" TIMESTAMPTZ(6),
    "reschedule_message" TEXT,
    "patient_name" VARCHAR(120) NOT NULL,
    "patient_age" INTEGER,
    "patient_gender" VARCHAR(10),
    "patient_phone" VARCHAR(20),
    "patient_address" VARCHAR(300),
    "patient_city" VARCHAR(80),
    "patient_village" VARCHAR(80),
    "patient_pincode" VARCHAR(10),
    "patient_house_number" VARCHAR(40),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_patients" (
    "id" SERIAL NOT NULL,
    "booking_id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" VARCHAR(2) NOT NULL,
    "symptom" TEXT NOT NULL,
    "onset" VARCHAR(40) NOT NULL,
    "score" INTEGER NOT NULL,
    "tier" VARCHAR(20) NOT NULL,
    "flags" JSONB NOT NULL,
    "comorb" JSONB NOT NULL,
    "mode" VARCHAR(20) NOT NULL,
    "time" VARCHAR(20) NOT NULL,
    "color" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "fee" INTEGER NOT NULL,

    CONSTRAINT "dashboard_patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_threads" (
    "id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "dashboard_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_messages" (
    "id" SERIAL NOT NULL,
    "thread_id" INTEGER NOT NULL,
    "who" VARCHAR(10) NOT NULL,
    "t" VARCHAR(40) NOT NULL,
    "txt" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dashboard_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_profile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(120) NOT NULL,
    "speciality" VARCHAR(80) NOT NULL,
    "fee" INTEGER NOT NULL,
    "home_fee" INTEGER NOT NULL,
    "languages" VARCHAR(120) NOT NULL,
    "bio" TEXT NOT NULL,
    "accept_video" BOOLEAN NOT NULL DEFAULT true,
    "accept_home_visits" BOOLEAN NOT NULL DEFAULT true,
    "auto_accept_low" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_notifications" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dashboard_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_runtime" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "schedule_json" JSONB NOT NULL DEFAULT '[]',
    "open_slots_json" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "dashboard_runtime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_session_id_idx" ON "bookings"("session_id");

-- CreateIndex
CREATE INDEX "bookings_doctor_id_idx" ON "bookings"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_patients_booking_id_key" ON "dashboard_patients"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_threads_patient_id_key" ON "dashboard_threads"("patient_id");

-- CreateIndex
CREATE INDEX "dashboard_messages_thread_id_idx" ON "dashboard_messages"("thread_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_patients" ADD CONSTRAINT "dashboard_patients_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_threads" ADD CONSTRAINT "dashboard_threads_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "dashboard_patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_messages" ADD CONSTRAINT "dashboard_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "dashboard_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

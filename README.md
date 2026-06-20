## CareConnect Chatbot (production-style full stack)

Patient chatbot + **live doctor dashboard** integration. When a patient completes a booking in the chat, it appears instantly in the doctor console queue — no separate sync step.

Based on [doctor_dashboard](https://github.com/ankanisairam07166-glitch/doctor_dashboard).

### Architecture

```
Patient UI (:5173)  ──►  CareConnect API (:8787)  ◄──  Doctor Dashboard UI (:5175)
                              │
                         PostgreSQL 16
                    (sessions, bookings, queue, messages)
```

### Run backend (shared API)

Start PostgreSQL first (Docker):

```bash
docker compose up -d postgres
```

Then install, migrate, and run the API:

```bash
cd backend
cp .env.example .env   # if you don't have .env yet
npm install
npm run db:migrate     # creates tables (first time only)
npm run dev
```

Production deploy: set `NODE_ENV=production`, `DATABASE_URL`, and run `npm run db:migrate:deploy` before `npm start`.

Backend runs on `http://127.0.0.1:8787` and serves **both** the patient chat API and the doctor-dashboard-compatible API (`/api/v1/queue`, `/api/v1/stats`, `/api/v1/booking/*`, etc.).

### Run patient chat frontend

```bash
cd frontend
npm install
npm run dev
```

Patient UI: `http://localhost:5173`

### Run doctor dashboard frontend

```bash
cd doctor-dashboard/frontend
npm install
npm run dev
```

Doctor console: `http://localhost:5174` — configured via `doctor-dashboard/frontend/.env` to call `http://127.0.0.1:8787`.

### Real-time flow

1. Patient completes assessment → triage stored on session
2. Patient books a doctor slot → `syncBookingToDashboard()` runs
3. Doctor dashboard queue updates immediately with symptom, triage score, flags, and mode
4. Doctor accepts/reschedules → booking status updates in PostgreSQL; patient chat polls for changes

### Environment variables

| App | File | Key |
|-----|------|-----|
| Backend | `backend/.env` | `PORT`, `HOST`, `CORS_ORIGIN`, `DATABASE_URL`, `LOG_LEVEL` |
| Patient UI | `frontend/.env` | `VITE_API_BASE_URL` |
| Doctor UI | `doctor-dashboard/frontend/.env` | `VITE_API_BASE` |

### Doctor dashboard API (on CareConnect backend)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/queue?tier=` | Live triage queue from patient bookings |
| GET | `/api/v1/stats` | Dashboard stats |
| POST | `/api/v1/booking/{id}/accept` | Accept booking |
| PATCH | `/api/v1/booking/{id}/reschedule` | Reschedule (doctor: `{slot}` / patient: `{slotAtIso, mode}`) |
| GET | `/api/v1/schedule` | Day schedule |
| GET | `/api/v1/messages` | Patient message threads |
| GET/PUT | `/api/v1/profile` | Doctor profile |
| POST | `/api/v1/availability` | Go online/offline |

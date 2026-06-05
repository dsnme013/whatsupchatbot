## CareConnect Chatbot (production-style full stack)

This is a production-structured **frontend + backend** implementation of the upgraded CareConnect WhatsApp-style healthcare chatbot flow (triage → doctor matching → consented history → booking → interactive checklist).

### Run backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://127.0.0.1:8787` by default.

### Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### Environment variables

- **Backend**: copy `backend/.env.example` → `backend/.env`
- **Frontend**: copy `frontend/.env.example` → `frontend/.env`


# Popular Mega Motors Workshop DMS Demo

Full-stack Indian dealership workshop demo for service intake, job card creation, technician workflow, billing, payment, and closure.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios, react-signature-canvas
- Backend: Python, FastAPI, SQLite
- Mocked behavior: plate extraction, odometer extraction, complaint parsing, payment notifications

## Folder Structure

```text
dms-demo/
  frontend/
  backend/
  README.md
```

## What Is Real vs Simulated

Real in the demo:

- SQLite persistence
- vehicle and customer lookup
- service history and previous payment history
- estimate calculation
- technician assignment persistence
- task status updates
- payment persistence
- closure rule enforcement
- notification logging

Simulated in the demo:

- number plate extraction
- odometer extraction
- complaint parsing
- payment gateway
- invoice / reminder delivery

## Demo Scenarios

- Routine 1st Service
- Routine 2nd Service
- AC & Electrical Issue
- Body Repair + Polish

Use seeded filenames such as:

- `plate_kl07ab1234.jpg`
- `odometer_15823km.jpg`
- `plate_body_creta.jpg`

## Backend Setup

From `backend/`:

```bash
python -m db.seed
uvicorn main:app --reload --host 0.0.0.0 --port 3001
```

FastAPI docs:

- `http://localhost:3001/docs`

Environment:

- `PORT=3001`
- `DB_PATH=./db/workshop_dms.sqlite`
- `UPLOAD_DIR=./uploads`

## Frontend Setup

From `frontend/`:

```bash
npm install
npm run dev
```

Frontend URL:

- `http://localhost:5173`

Environment:

- `VITE_API_BASE_URL=http://localhost:3001/api`

## Deployment

Recommended shareable demo setup:

- `frontend/` on Vercel
- `mail-service/` on Vercel
- `backend/` on Render with a persistent disk

### Frontend on Vercel

- Root directory: `dms-demo/frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Add env:
  - `VITE_API_BASE_URL=https://<your-render-backend>/api`
- Keep [vercel.json](C:\projects\Popular Vehicles\dms-demo\frontend\vercel.json) so React Router deep links rewrite to `index.html`.

### Mail Service on Vercel

- Root directory: `dms-demo/mail-service`
- Deploy separately from the frontend
- Configure:
  - `MAIL_SERVICE_SECRET`
  - `MAIL_FROM`
  - `MAIL_PROVIDER_HOST`
  - `MAIL_PROVIDER_PORT`
  - `MAIL_PROVIDER_SECURE`
  - `MAIL_PROVIDER_USER`
  - `MAIL_PROVIDER_PASS`

### Backend on Render

- Use [render.yaml](C:\projects\Popular Vehicles\dms-demo\render.yaml) as the deployment blueprint
- Attach the persistent disk defined there so SQLite, uploads, and generated PDFs survive restarts
- Set secret env vars in Render:
  - `OPENROUTER_API_KEY`
  - `MAIL_SERVICE_URL`
  - `MAIL_SERVICE_SECRET`
  - `FEEDBACK_FORM_URL`
  - `FRONTEND_APP_URL`
- If you need multiple frontend origins, set:
  - `ALLOWED_ORIGINS=https://<frontend>.vercel.app,http://localhost:5173`

## Main Workflow

1. Open dashboard and launch a scenario or start a new job card.
2. Upload plate and odometer images, then run Suggested Match.
3. Review customer, vehicle, service, complaint, and payment context.
4. Analyze complaint into suggested services.
5. Add advisor observations, repairs, parts, and add services.
6. Save estimate and approval.
7. Assign technicians.
8. Use technician view to update work or raise additional issues.
9. Record payment in billing.
10. Close only after payment in delivery view.

## Known Limitations

- Service catalog selection is driven by seeded demo logic rather than a dedicated frontend service-catalog API.
- Reminder notifications are logged as simulated records; they are not delivered externally.
- The backend uses a local SQLite file tuned for this workspace environment.

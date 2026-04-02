# Popular Mega Motors Mail Service

This Vercel-ready Node service receives authenticated mail requests from the FastAPI backend and sends them with Nodemailer.

## Endpoint

- `POST /api/send-email`

## Required environment variables

- `MAIL_SERVICE_SECRET`
- `MAIL_FROM`
- `MAIL_PROVIDER_HOST`
- `MAIL_PROVIDER_PORT`
- `MAIL_PROVIDER_SECURE`
- `MAIL_PROVIDER_USER`
- `MAIL_PROVIDER_PASS`

## Backend environment variables

Point the FastAPI backend at the deployed Vercel endpoint:

- `MAIL_SERVICE_URL=https://your-mail-service.vercel.app/api/send-email`
- `MAIL_SERVICE_SECRET=the-same-shared-secret`

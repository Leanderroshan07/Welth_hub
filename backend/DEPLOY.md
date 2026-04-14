# Deploying Vaazhi backend (Telegram bot)

This file lists concise steps to get the backend running in production.

1) Create a Supabase project
- Go to https://app.supabase.com and create a new project.
- Copy the `PROJECT URL` and `anon` and `service_role` keys (Project Settings → API).

2) Apply the database schema (two options)
- Using Supabase CLI (recommended):

```bash
# install CLI if needed
npm install -g supabase

# login
supabase login

# from repo root
cd backend/supabase

# push the local schema to your remote project (link or --project-ref)
supabase link --project-ref <PROJECT_REF>
supabase db push
```

- Or, use the SQL editor in the Supabase dashboard and paste `backend/supabase/schema.sql`.

3) Prepare environment variables
- Create a `.env` locally for testing and configure secrets in your hosting provider for production.
- Required env vars for the backend:
  - `SUPABASE_URL` — Supabase project URL
  - `SUPABASE_ANON_KEY` — Supabase anon key (or `SUPABASE_SERVICE_ROLE_KEY` for server operations; prefer service role in production)
  - `TELEGRAM_BOT_TOKEN` — Telegram bot token from BotFather
  - `AUTHORIZED_TELEGRAM_USER_IDS` — comma-separated Telegram user IDs (or leave empty to use access key)
  - `TELEGRAM_ACCESS_KEY` or `TELEGRAM_SECRET_KEY` — optional; users can send this to gain access
  - `TELEGRAM_ADMIN_USER_IDS` — optional comma-separated admin IDs

4) Deploy the backend
- Option A — Render / Railway (no Docker required): create a new service, connect repo, set the start command `npm start` and add env vars.
- Option B — Docker (works with Render, Fly, Docker Cloud, or self-hosting):

```bash
cd backend
docker build -t vaazhi-backend .
docker run --env-file .env -d --name vaazhi-backend vaazhi-backend
```

5) Deploy the frontend
- Recommended services: Vercel, Netlify, or Render static sites.
- Set build command: `npm run build` and publish directory: `dist`.
- Add environment variables (build-time): `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

6) Domain & TLS
- Configure your domain on the hosting provider (Vercel/Render) and enable automatic TLS (Let's Encrypt).

7) Test end-to-end
- Start backend locally and verify bot responds to `/start` and that Supabase tables are populated.

8) Security notes
- Prefer using the Supabase `service_role` key on the server side and the anon key only in the frontend.
- Never commit `.env` or secrets to the repository.

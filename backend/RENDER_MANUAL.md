Render deployment manual for Vaazhi backend

Overview
- This document describes manual steps to create and configure a Render Web Service for the backend (Telegram bot + Supabase integration).

Prerequisites
- A Render account with access to create services.
- Repository: https://github.com/Leanderroshan07/Welth_hub (branch `main`).
- Root directory for service: `backend`.
- Ensure secrets are rotated and `.env` is not tracked in git.

Create the Render Web Service (UI)
1. On Render, click "New" → "Web Service".
2. Connect your GitHub account and choose the repo `Welth_hub`.
3. Branch: `main`.
4. Root Directory: `backend`.
5. Name: choose `Welth_hub` or other unique name.
6. Build Command: `npm ci`
7. Start Command: `npm start`
8. Environment: Node (runtime auto-detected)
9. Plan: Starter/Free is OK for webhook-based web service.
10. Create the service.

Environment variables (add these via Render Dashboard → Environment → New Variable)
- TELEGRAM_BOT_TOKEN (secure)
- TELEGRAM_SECRET_TOKEN (secure) — a random 32-byte base64 string. Keep it secret.
- WEBHOOK_URL (e.g., https://your-service.onrender.com)
- WEBHOOK_PATH (e.g., /bot)
- SUPABASE_URL
- SUPABASE_ANON_KEY (secure)
- AUTHORIZED_TELEGRAM_USER_IDS (comma-separated integers)
- NODE_ENV=production (optional)

Webhook setup
- The backend listens at `POST $WEBHOOK_PATH`.
- If `TELEGRAM_SECRET_TOKEN` is configured, Telegram will send `x-telegram-bot-api-secret-token` header that the server validates.
- To register the webhook manually, call Telegram's setWebhook (replace placeholders):

curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d url="https://<your-service-domain>$WEBHOOK_PATH" \
  -d secret_token="<TELEGRAM_SECRET_TOKEN>"

Verification & logs
- After deploy, open the Render dashboard for the service and view logs.
- Look for: "Vaazhi Telegram bot is running." and "Webhook server listening on port" messages.
- Use the Telegram `getWebhookInfo` endpoint to confirm webhook is set.

Notes & troubleshooting
- If deploy fails due to `npm ci` lock mismatch, change Build Command to `npm install` in Render service settings and redeploy.
- Keep all sensitive values out of git. Use Render's secure environment variables.
- If you prefer automation, create scripts locally and run them from a secured machine; do not commit API keys.

Contact
- If you'd like, I can re-add a small, documented helper script (non-sensitive) or reattempt service creation via the API with your approval.

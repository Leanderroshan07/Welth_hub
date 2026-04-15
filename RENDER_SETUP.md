# Render Deployment Setup - Step by Step

## Prerequisites
- Supabase project created (see DEPLOY.md)
- Telegram bot token from BotFather
- GitHub repository connected to Render

## Step 1: Deploy Backend Service

### Option A: Using render.yaml (Recommended)
1. Push the `render.yaml` file to your GitHub repo
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New +"** → **"Blueprint"**
4. Connect your GitHub repo
5. Select the repo and click **"Connect"**
6. Render will automatically read `render.yaml` and create the services
7. Set environment variables (see Step 2)
8. Click **"Create New Services"**

### Option B: Manual Web Service Setup
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Fill in:
   - **Name:** `vaazhi-backend`
   - **Region:** Pick your region (e.g., `Ohio` for US)
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or Pro if needed)
5. Click **"Create Web Service"**

## Step 2: Configure Environment Variables

After creating the service, go to **Settings** → **Environment** and add:

### Required Variables
```
SUPABASE_URL = your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
TELEGRAM_BOT_TOKEN = your_telegram_bot_token
```

### Optional Variables
```
AUTHORIZED_TELEGRAM_USER_IDS = 123456789
TELEGRAM_ADMIN_USER_IDS = 123456789
TELEGRAM_ACCESS_KEY = your_secret_key
```

## Step 3: Get Your Backend URL
After deployment:
1. Go to your service on Render
2. Copy the URL (e.g., `https://vaazhi-backend-xxxx.onrender.com`)
3. Update `WEBHOOK_URL` environment variable with this URL

## Step 4: Set Telegram Webhook

Your bot will automatically set the webhook on first request, but you can manually verify:

```bash
curl -X POST https://api.telegram.org/bot{YOUR_BOT_TOKEN}/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-render-domain.onrender.com/bot{YOUR_BOT_TOKEN}",
    "secret_token": "your_secret_token_from_env"
  }'
```

Expected response:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

## Step 5: Test the Backend

### Test 1: Health Check
```bash
curl https://your-render-domain.onrender.com/
# Should return: "Vaazhi webhook server running"
```

### Test 2: Send Message to Bot
1. Open Telegram
2. Find your bot
3. Send `/start`
4. Bot should respond with main menu

### Check Logs
1. Go to Render dashboard
2. Click your service
3. Go to **"Logs"** tab
4. Look for:
   - `Webhook server listening on port 3000`
   - Any error messages
   - Bot activity logs

## Step 6: Deploy Frontend

1. Go to Render Dashboard
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub repo
4. Fill in:
   - **Name:** `vaazhi-frontend`
   - **Branch:** `main`
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Publish directory:** `frontend/dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **"Create Static Site"**

## Troubleshooting

### Bot Not Responding
- Check backend logs in Render dashboard
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Verify `WEBHOOK_URL` is set correctly
- Check `TELEGRAM_SECRET_TOKEN` matches Telegram webhook setting

### Webhook URL Mismatch
- Error: `Failed to set webhook`
- Fix: Ensure `WEBHOOK_URL` matches your Render domain exactly
- Pattern: `https://service-name-xxxx.onrender.com`

### Database Connection Error
- Error: `Cannot connect to Supabase`
- Fix: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct

### Service Won't Start
- Check build logs
- Ensure `npm start` works locally: `npm start` from backend folder
- Check for syntax errors: `node -c src/webhookServer.js`

## Environment Variable Reference

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | ✅ | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxx...` | ✅ | Service role key (server-side) |
| `TELEGRAM_BOT_TOKEN` | `123456789:ABCde...` | ✅ | From BotFather |
| `TELEGRAM_SECRET_TOKEN` | `my-secret-123` | ✅ | Any random string, used for webhook verification |
| `WEBHOOK_URL` | `https://vaazhi-backend-xxxx.onrender.com` | ✅ | Your Render service URL |
| `WEBHOOK_PATH` | `/botXXX:yyyy` | ❌ | Auto-generated from token if not set |
| `NODE_ENV` | `production` | ❌ | Set to production for cleaner logs |
| `AUTHORIZED_TELEGRAM_USER_IDS` | `123456789,987654321` | ❌ | Comma-separated user IDs (leave empty for access key mode) |
| `TELEGRAM_ADMIN_USER_IDS` | `123456789` | ❌ | Admin users (can manage other users) |
| `TELEGRAM_ACCESS_KEY` | `mykey123` | ❌ | Alternative auth: users send this in chat |

## Monitoring

### View Live Logs
```bash
# In Render dashboard, click Logs tab and filter by:
# - "Webhook received" = incoming updates
# - "Error" = problems
# - "Task add initiated" = task creation
# - "Supabase" = database operations
```

### Common Log Messages (Good Signs)
- ✅ `Webhook server listening on port 3000`
- ✅ `Set Telegram webhook to https://...`
- ✅ `📨 Webhook received`
- ✅ `✅ Task add initiated`

### Red Flags (Errors)
- ❌ `Cannot find module`
- ❌ `SUPABASE_URL is missing`
- ❌ `Error processing webhook`
- ❌ `Cannot connect to Supabase`

## Manual Webhook Setup (if auto-setup fails)

Get your bot token and secret, then run:

```bash
curl -X POST https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://your-render-url.onrender.com/bot{YOUR_TOKEN}\",
    \"secret_token\": \"your-secret-from-env\"
  }"
```

Verify it was set:
```bash
curl https://api.telegram.org/bot{YOUR_TOKEN}/getWebhookInfo
```

## Need Help?

1. Check backend logs first (Render dashboard → Logs)
2. Verify all environment variables are set
3. Test locally: `npm start` from backend folder
4. Check that Telegram bot token is correct

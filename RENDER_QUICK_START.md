# Quick Render Deployment Checklist

## 🚀 Deploy Backend in 5 Minutes

### Step 1: Add render.yaml to Your Repo
```bash
# render.yaml is already in the repo root
# Just commit and push to GitHub
git add render.yaml
git commit -m "Add Render deployment config"
git push
```

### Step 2: Go to Render Dashboard
- Open: https://dashboard.render.com
- Click: **"New +"** → **"Blueprint"**
- Select: Your GitHub repo (Wealth_hub)
- Follow defaults (or customize)
- Click: **"Create New Services"** (or **"Deploy"**)

### Step 3: Get Your Backend URL
After ~2-3 minutes:
- Copy the URL shown (e.g., `https://vaazhi-backend-xxxx.onrender.com`)
- Save it - you'll need it for Step 4

### Step 4: Add Environment Variables
In Render dashboard for backend service:
- Click: **Settings** → **Environment**
- Add these variables:

```
SUPABASE_URL = your_supabase_url
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key  
TELEGRAM_BOT_TOKEN = your_bot_token
AUTHORIZED_TELEGRAM_USER_IDS = your_user_id (optional)
TELEGRAM_ACCESS_KEY = access_key (optional)
```

### Step 5: Wait for Deploy
Render will automatically:
- Install dependencies
- Start the bot in polling mode
- Bot will connect to Supabase and listen for messages
- No webhook setup needed!

### Step 6: Test
Send `/start` to your Telegram bot
- ✅ Should get main menu response

---

## 📋 Multi-Service Setup (Optional)

If you want frontend AND backend:

### Backend Service
```
Name: vaazhi-backend
Build: npm install
Start: npm start
Runtime: Node
```

### Frontend Service  
```
Name: vaazhi-frontend
Build: cd frontend && npm install && npm run build
Publish: frontend/dist
Runtime: Static Site
```

---

## 🔑 Required Environment Variables

### For Backend
| Variable | Where to Get |
|----------|-------------|
| `SUPABASE_URL` | Supabase Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API |
| `TELEGRAM_BOT_TOKEN` | From BotFather on Telegram |
| `TELEGRAM_SECRET_TOKEN` | Any random string (you create it) |
| `WEBHOOK_URL` | Your Render backend URL |

### For Frontend
| Variable | Where to Get |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Project Settings → API |

---

## ✅ Verification Checklist

- [ ] Backend deployed to Render
- [ ] Backend URL copied (e.g., https://xxx.onrender.com)
- [ ] All 5 environment variables set
- [ ] Telegram `/start` command works
- [ ] Bot responds with menu
- [ ] Can add a task
- [ ] Logs show "✅ Task saved successfully!"
- [ ] Frontend deployed (optional)

---

## 🆘 Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot doesn't respond | Check backend logs in Render |
| Webhook URL error | Verify WEBHOOK_URL environment variable |
| Database connection error | Check SUPABASE_URL and keys |
| Service won't start | Check NODE_ENV and SUPABASE keys |

---

## View Logs in Render

1. Go to: https://dashboard.render.com
2. Click: your workspace
3. Click: **vaazhi-backend** service
4. Click: **"Logs"** tab
5. Look for lines with:
   - 📨 "Webhook received"
   - ✅ "Task add initiated"  
   - ❌ Any errors

---

## Reset Webhook URL (if needed)

If you need to update the webhook:
```bash
curl -X POST https://api.telegram.org/bot{TOKEN}/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-new-url.onrender.com/bot{TOKEN}","secret_token":"your_secret"}'
```

---

**Next**: See RENDER_SETUP.md for detailed troubleshooting

# 🚀 Complete Render Deployment Guide - WealthHub Project

## Project Overview
- **Backend**: Node.js + Express + Telegram Bot API + Supabase
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Total Services**: 2 (Backend Web Service + Frontend Static Site)

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. **GitHub Setup**
- [ ] Repository pushed to GitHub
- [ ] Main branch is up-to-date with all code
- [ ] `.env` files are in `.gitignore` (not committed)
- [ ] `render.yaml` is committed to repository

### 2. **Supabase Setup**
- [ ] Supabase project created and initialized
- [ ] Database migrations applied
- [ ] Service role key obtained
- [ ] Project URL saved

### 3. **Telegram Bot Setup**
- [ ] Telegram bot created via BotFather
- [ ] Bot token saved
- [ ] Bot is active and responding

### 4. **Render Account**
- [ ] Render account created (renders.com)
- [ ] GitHub connected to Render
- [ ] Render API key available (for manual API calls)

---

## 📦 PART 1: PROJECT STRUCTURE & FILES

### Backend Files Required
```
backend/
├── package.json          ✅ Dependencies
├── Procfile              ✅ Run command (backup)
├── src/
│   ├── telegramBot.js    ✅ Polling mode
│   ├── webhookServer.js  ✅ Webhook mode
│   ├── supabaseClient.js ✅ Supabase connection
│   ├── taskModule.js     ✅ Task handling
│   ├── moneyModule.js    ✅ Money handling
│   ├── goalBotModule.js  ✅ Goal handling
│   └── goalModule.js     ✅ Goal logic
└── supabase/
    ├── config.toml       ✅ Supabase config
    └── migrations/       ✅ All SQL migrations
```

### Frontend Files Required
```
frontend/
├── package.json          ✅ Dependencies
├── vite.config.js        ✅ Vite config
├── src/
│   ├── main.jsx          ✅ Entry point
│   ├── App.jsx           ✅ Main component
│   ├── index.css         ✅ Styles
│   ├── CashFlow.jsx      ✅ Dashboard
│   ├── FinancialTasks.jsx ✅ Tasks view
│   ├── ChallengesTracker.jsx ✅ Challenges view
│   ├── GoalTracking.jsx  ✅ Goals view
│   └── supabaseClient.js ✅ Supabase config
└── index.html            ✅ HTML template
```

### Root Files
```
render.yaml              ✅ Deploy config (required)
.gitignore              ✅ Exclude .env
.env.example            ✅ Optional: Template
```

---

## 🔑 PART 2: ENVIRONMENT VARIABLES NEEDED

### Backend Environment Variables

| Variable | Value | Source |
|----------|-------|--------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | (long string) | Supabase → Settings → API |
| `TELEGRAM_BOT_TOKEN` | `6234567890:AAExxxxxxx` | BotFather on Telegram |
| `TELEGRAM_SECRET_TOKEN` | Any random string | Create yourself |
| `AUTHORIZED_TELEGRAM_USER_IDS` | Your Telegram user ID | Get from `/start` message |
| `TELEGRAM_ADMIN_USER_IDS` | Your Telegram user ID | Same as above |
| `TELEGRAM_ACCESS_KEY` | Random string (optional) | Create yourself |
| `WEBHOOK_URL` | (Auto-generated) | Set after deployment |

### Frontend Environment Variables

| Variable | Value | Source |
|----------|-------|--------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Same as backend |
| `VITE_SUPABASE_ANON_KEY` | (public key) | Supabase → Settings → API |

---

## ⚙️ PART 3: CONFIGURATION FILES

### A. render.yaml (Already in repo)
This file tells Render how to deploy both services:

```yaml
services:
  # Backend service (Telegram bot - polling mode)
  - type: web
    name: vaazhi-backend
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm run start:webhook
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: TELEGRAM_BOT_TOKEN
        sync: false
      - key: AUTHORIZED_TELEGRAM_USER_IDS
        sync: false
      - key: TELEGRAM_ADMIN_USER_IDS
        sync: false
      - key: TELEGRAM_ACCESS_KEY
        sync: false
      - key: TELEGRAM_SECRET_TOKEN
        sync: false
      - key: WEBHOOK_URL
        sync: false

  # Frontend service
  - type: static
    name: vaazhi-frontend
    runtime: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    routes:
      - path: /
        methods:
          - GET
        dest: /index.html
```

### B. Frontend vite.config.js - Should Look Like:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
})
```

### C. Backend .env Format (LOCAL ONLY - not in repo)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
TELEGRAM_BOT_TOKEN=6234567890:AAExxxxxxx
TELEGRAM_SECRET_TOKEN=mysecrettoken123
AUTHORIZED_TELEGRAM_USER_IDS=123456789
TELEGRAM_ADMIN_USER_IDS=123456789
TELEGRAM_ACCESS_KEY=myaccesskey
WEBHOOK_URL=https://vaazhi-backend-xxxx.onrender.com
```

---

## 🚀 PART 4: STEP-BY-STEP DEPLOYMENT

### **STEP 1: Prepare GitHub Repository**

```powershell
# 1. Ensure all code is committed
cd c:\projects\Wealth_hub
git status

# 2. If there are changes, commit them
git add .
git commit -m "Prepare for Render deployment"

# 3. Push to GitHub
git push origin main
```

### **STEP 2: Verify render.yaml in Repo**

```powershell
# Check that render.yaml exists and is committed
git ls-files | findstr render.yaml

# Should show: render.yaml
```

### **STEP 3: Go to Render Dashboard**

1. Open browser: **https://dashboard.render.com**
2. Sign in with GitHub account
3. Click **"New +"** button (top-left)
4. Select **"Blueprint"** from dropdown

### **STEP 4: Create Services from Blueprint**

1. **Connect GitHub**: 
   - Select your GitHub account
   - Select `Wealth_hub` repository
   - Click **"Connect"**

2. **Review Blueprint Configuration**:
   - Should show 2 services: **vaazhi-backend** and **vaazhi-frontend**
   - Branch should be: **main**
   - Click **"Create New Services"** (or "Update Existing" if redeploying)

3. **Wait for Initial Deploy**:
   - Backend: ~2-3 minutes
   - Frontend: ~2-3 minutes
   - Total: 5-10 minutes

### **STEP 5: Configure Backend Environment Variables**

After services are created:

1. Go to **Render Dashboard**
2. Click on **vaazhi-backend** service
3. Go to **Settings** → **Environment**
4. Add these variables (click "Add Environment Variable"):

```
SUPABASE_URL = https://xxxxxxxxxxxxx.supabase.co

SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
(Copy from Supabase: Settings → API → Service Role Key)

TELEGRAM_BOT_TOKEN = 6234567890:AAExxxxxxxxxxxxxxx
(From BotFather)

TELEGRAM_SECRET_TOKEN = mysecrettoken12345
(Any random string you create)

AUTHORIZED_TELEGRAM_USER_IDS = 123456789
(Your Telegram user ID)

TELEGRAM_ADMIN_USER_IDS = 123456789
(Your Telegram user ID)

TELEGRAM_ACCESS_KEY = myaccesskey
(Any random string)

WEBHOOK_URL = https://vaazhi-backend-xxxx.onrender.com
(Copy your backend URL from Render, shown on your service page)
```

5. Click **"Save Changes"**

### **STEP 6: Configure Frontend Environment Variables**

1. Go to **Render Dashboard**
2. Click on **vaazhi-frontend** service
3. Go to **Settings** → **Environment**
4. Add these variables:

```
VITE_SUPABASE_URL = https://xxxxxxxxxxxxx.supabase.co
(Same as backend)

VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
(From Supabase: Settings → API → Anon Key)
```

5. Click **"Save Changes"**

### **STEP 7: Trigger Manual Deploys (if needed)**

1. **Backend**:
   - Go to vaazhi-backend service
   - Click **"Manual Deploy"** → **"Deploy Latest"**
   - Wait 2-3 minutes

2. **Frontend**:
   - Go to vaazhi-frontend service
   - Click **"Manual Deploy"** → **"Deploy Latest"**
   - Wait 2-3 minutes

---

## ✅ PART 5: POST-DEPLOYMENT VERIFICATION

### **Test 1: Backend Health Check**

```powershell
# Get your backend URL from Render dashboard
# Format: https://vaazhi-backend-xxxx.onrender.com

$BACKEND_URL = "https://vaazhi-backend-xxxx.onrender.com"

# Health check
Invoke-WebRequest -Uri "$BACKEND_URL/" -UseBasicParsing
# Should return 200 OK

# Check logs
# Go to Render → vaazhi-backend → Logs
# Look for: "Webhook server listening on port 3000" or "Bot polling started"
```

### **Test 2: Telegram Bot**

1. Open Telegram
2. Find your bot
3. Send `/start`
4. Should see main menu with options:
   - 💰 Money Tracker
   - 📋 Task Manager
   - 🏆 Challenges
   - 🎯 Goals

### **Test 3: Frontend Access**

1. Get frontend URL from Render dashboard
   - Format: `https://vaazhi-frontend-xxxx.onrender.com`
2. Open in browser
3. Should see login/dashboard interface
4. Try logging in with test credentials

### **Test 4: Check Render Logs**

```powershell
# PowerShell: Get backend logs
$RENDER_API_KEY = "rnd_xxxxx"  # Your Render API key
$SERVICE_ID = "srv-xxxxx"      # From Render service page URL

$Headers = @{
    Authorization = "Bearer $RENDER_API_KEY"
}

Invoke-RestMethod -Uri "https://api.render.com/v1/services/$SERVICE_ID/logs?limit=100" `
    -Headers $Headers | ConvertTo-Json -Depth 5
```

---

## 🔧 TROUBLESHOOTING

### Issue: Backend deploy fails
**Solution**:
- Check Render logs for error messages
- Verify `npm install` succeeds locally
- Check for missing dependencies in package.json
- Ensure Node.js version compatibility

### Issue: Bot doesn't respond
**Solution**:
1. Check logs for errors
2. Verify all 7 environment variables are set
3. Verify bot token is correct
4. Test with: `/start` command
5. Check Telegram webhook status

### Issue: Frontend shows errors
**Solution**:
1. Check browser console (F12 → Console)
2. Check Render frontend logs
3. Verify Vite build succeeded (check logs)
4. Test environment variables are correct

### Issue: Can't access backend or frontend
**Solution**:
1. Verify services are in "Live" state on Render
2. Check if backend is within free tier resource limits
3. Free tier spins down after 15 minutes of inactivity
4. Upgrade to paid tier if needed

---

## 📊 ESTIMATED COSTS

### Render Pricing (As of 2026)
- **Backend (Free Tier)**: $0/month (limited to 0.5 CPU, 512 RAM)
- **Frontend (Free Tier)**: $0/month (limited bandwidth)
- **Backend (Paid)**: $7/month (1 CPU, 512 RAM)
- **Frontend (Paid)**: $0.20/GB bandwidth

### Supabase Pricing
- **Free Tier**: $0/month (500 MB storage, 1 GB bandwidth)
- **Pro Tier**: $25/month (8 GB storage)

---

## 🔄 CONTINUOUS DEPLOYMENT

After initial setup, deployments are automatic:
1. Push code to GitHub `main` branch
2. Render automatically detects changes
3. Runs build commands
4. Deploys new version (5-10 minutes)

To manually deploy:
1. Go to Render service page
2. Click **"Manual Deploy"** → **"Deploy Latest"**

---

## 📝 QUICK REFERENCE

| Task | Where |
|------|-------|
| View Logs | Render → Service → Logs tab |
| Change Variables | Render → Service → Settings → Environment |
| Deploy Manually | Render → Service → Manual Deploy |
| Get Service URL | Render → Service → URL shown at top |
| Check Status | Render → Service → Status indicator |

---

## 🎯 SUCCESS CRITERIA

✅ All deployment complete when:
1. Both services show "Live" status
2. `/` endpoint returns 200 OK
3. Telegram bot responds to `/start`
4. Frontend loads without errors
5. Can create tasks/goals via Telegram
6. Dashboard displays data correctly

---

**DEPLOYMENT TIME**: ~20-30 minutes total (mostly waiting for builds)
**DIFFICULTY**: Medium (straightforward if all prerequisites are ready)

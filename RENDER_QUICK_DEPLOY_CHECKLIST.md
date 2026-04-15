# 🎯 Render Deployment - Quick Action Checklist

## PRE-DEPLOYMENT (Do These First)

### Gather Required Information
- [ ] **Supabase URL**: Get from Supabase → Settings → API
  - Value: `https://_____________.supabase.co`
  
- [ ] **Supabase Service Role Key**: From Supabase → Settings → API
  - Value: `eyJhbGci...` (long string)
  
- [ ] **Supabase Anon Key**: From Supabase → Settings → API  
  - Value: `eyJhbGci...` (shorter string)
  
- [ ] **Telegram Bot Token**: From BotFather
  - Value: `123456789:AABBB...`
  
- [ ] **Your Telegram User ID**: Send `/start` to bot, check logs
  - Value: (7-10 digit number)

---

## DEPLOYMENT STEPS (In Order)

### 1️⃣ GitHub Commit & Push
```powershell
cd c:\projects\Wealth_hub
git add .
git commit -m "Ready for Render deployment"
git push origin main
```
- [ ] Code pushed to GitHub

---

### 2️⃣ Create Render Blueprint
- [ ] Go to: https://dashboard.render.com
- [ ] Click: **"New +"** → **"Blueprint"**
- [ ] Select: **Wealth_hub** repository
- [ ] Click: **"Connect"**
- [ ] Review services (should show backend + frontend)
- [ ] Click: **"Create New Services"**
- [ ] Wait 5-10 minutes for deploy to complete

---

### 3️⃣ Get Your Backend URL
- [ ] Go to Render Dashboard
- [ ] Click: **vaazhi-backend** service
- [ ] Copy URL (shown in header, like `https://vaazhi-backend-xxxx.onrender.com`)
- [ ] Save this URL

---

### 4️⃣ Configure Backend Variables
- [ ] Click: **vaazhi-backend** service → **Settings** → **Environment**
- [ ] Add `SUPABASE_URL` = (your value from step 1)
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` = (your value from step 1)
- [ ] Add `TELEGRAM_BOT_TOKEN` = (your value from step 1)
- [ ] Add `TELEGRAM_SECRET_TOKEN` = (any string, like `mysecret123`)
- [ ] Add `AUTHORIZED_TELEGRAM_USER_IDS` = (your Telegram ID)
- [ ] Add `TELEGRAM_ADMIN_USER_IDS` = (your Telegram ID)
- [ ] Add `TELEGRAM_ACCESS_KEY` = (any string, like `mykey123`)
- [ ] Add `WEBHOOK_URL` = (your backend URL from step 3)
- [ ] Click: **"Save Changes"**

---

### 5️⃣ Configure Frontend Variables
- [ ] Click: **vaazhi-frontend** service → **Settings** → **Environment**
- [ ] Add `VITE_SUPABASE_URL` = (same as backend)
- [ ] Add `VITE_SUPABASE_ANON_KEY` = (your anon key from step 1)
- [ ] Click: **"Save Changes"**

---

### 6️⃣ Trigger Redeploy (if needed)
- [ ] Go to **vaazhi-backend** → Click: **"Manual Deploy"** → **"Deploy Latest"**
- [ ] Go to **vaazhi-frontend** → Click: **"Manual Deploy"** → **"Deploy Latest"**
- [ ] Wait 5 minutes

---

## POST-DEPLOYMENT TESTS

### Test Backend Health
```powershell
# Replace with your actual backend URL
Invoke-WebRequest -Uri "https://vaazhi-backend-xxxx.onrender.com/" -UseBasicParsing
# Should return: 200 OK
```
- [ ] Backend responds

---

### Test Telegram Bot
- [ ] Open Telegram
- [ ] Find your bot
- [ ] Send `/start`
- [ ] Should see main menu (💰 Money, 📋 Tasks, 🏆 Challenges, 🎯 Goals)
- [ ] Try adding a task/goal

---

### Test Frontend
- [ ] Go to: `https://vaazhi-frontend-xxxx.onrender.com`
- [ ] Should see login/dashboard
- [ ] Try logging in with test account
- [ ] Verify data loads correctly

---

### Check Status
- [ ] Both services show **"Live"** status in Render
- [ ] No errors in logs (Render → Service → Logs)

---

## QUICK REFERENCE: What Goes Where

### Supabase Settings → API Section
```
You need to copy:
✅ Project URL
✅ Service Role Key  
✅ Anon Key
```

### Render Environment Variables
```
Backend needs 8 variables (see Step 4)
Frontend needs 2 variables (see Step 5)
```

### Telegram Bot Setup (from BotFather)
```
You already have:
✅ Bot Token
✅ Bot is active

You need:
📋 Your Telegram User ID
```

---

## TROUBLESHOOTING QUICK FIXES

| Problem | Fix |
|---------|-----|
| Services won't deploy | Check Render logs for error, re-submit |
| Bot doesn't respond | Verify TELEGRAM_BOT_TOKEN is correct |
| Frontend shows errors | Check browser F12 → Console for errors |
| Can't access frontend | Wait 15 min (free tier spins down) or check status |
| Environment vars not working | Re-deploy after saving variables |

---

## ✅ SUCCESS CHECKLIST

- [ ] render.yaml committed to GitHub
- [ ] Backend deployed and showing "Live" status
- [ ] Frontend deployed and showing "Live" status  
- [ ] All 8 backend environment variables set
- [ ] All 2 frontend environment variables set
- [ ] Backend URL responds to health check
- [ ] Telegram bot responds to `/start` command
- [ ] Frontend loads in browser without errors
- [ ] Can create tasks/goals via Telegram bot
- [ ] Dashboard displays data correctly

---

**NEXT STEPS**: Follow the numbered steps 1-6 above, then run the post-deployment tests.

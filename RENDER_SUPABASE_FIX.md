# Render Supabase Connection Fix - Complete Guide

## 🔴 Problem: Tasks Not Saving / Bot Not Responding

This happens when Render backend cannot connect to Supabase.

---

## ✅ What I Fixed

### 1. **Supabase Client Now Uses Service Role Key** ✅
**Problem:** Was using `SUPABASE_ANON_KEY` (limited permissions)  
**Fix:** Now uses `SUPABASE_SERVICE_ROLE_KEY` (full permissions) for server operations

### 2. **Better Connection Diagnostics** ✅
When server starts, you now see:
```
=== SUPABASE CONNECTION INFO ===
📍 Supabase URL: ✅ Set
🔑 Service Role Key: ✅ Set
✅ Supabase connection successful!
```

### 3. **Connection Test on Startup** ✅
Server won't start if it can't connect to Supabase:
```
🧪 Testing Supabase connection...
✅ Supabase connection successful!
```

### 4. **Health Check Endpoint** ✅
Test Supabase anytime without bot:
```bash
curl https://your-render-url.onrender.com/health
# Returns: {"status":"ok","supabase":"connected"}
```

### 5. **Better Logging** ✅
Every database operation now logs:
```
💾 Saving task...
🔗 Connecting to Supabase
✅ Task saved successfully!
```

---

## 🚀 How to Fix on Render

### Step 1: Update Environment Variables

In Render dashboard, go to **vaazhi-backend** → **Settings** → **Environment**

Change these variables:

**REMOVE:**
- `SUPABASE_ANON_KEY` (if it exists)

**ADD/UPDATE:**
```
SUPABASE_URL = https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TELEGRAM_BOT_TOKEN = 123456789:ABCdef...
TELEGRAM_SECRET_TOKEN = any-random-string-123
WEBHOOK_URL = https://vaazhi-backend-xxxx.onrender.com
```

### Step 2: Get Correct Supabase Keys

1. Go to: https://app.supabase.com
2. Click your project
3. Click: **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (NOT anon public)

### Step 3: Restart Service

In Render dashboard:
1. Click **vaazhi-backend** service
2. Click **Settings** (top right)
3. Click **"Restart latest deploy"**

### Step 4: Check Logs

1. Click **Logs** tab
2. Look for:
   - ✅ `Supabase connection successful!`
   - ✅ `Webhook server listening on port 3000`

If you see ❌ errors, read **SUPABASE_TROUBLESHOOTING.md**

---

## ✅ Verify It's Working

### Test 1: Health Check
```bash
curl https://your-render-url.onrender.com/health
```

Expected response:
```json
{"status":"ok","supabase":"connected"}
```

### Test 2: Send Bot Message
1. Open Telegram
2. Send `/start` to your bot
3. Should see main menu

### Test 3: Try Adding Task
1. Click "Add Task"
2. Enter task name
3. Complete the steps
4. Watch Render logs for:
   ```
   💾 Saving task...
   ✅ Task saved successfully!
   ```

### Test 4: Check Local (Optional)
```bash
cd backend
npm install
node test-supabase.js
```

Should show:
```
✅ financial_tasks table found
✅ Can insert to database
✅ Ready to deploy on Render
```

---

## 📋 New Files Added

1. **`backend/test-supabase.js`** - Local diagnostic tool
2. **`SUPABASE_TROUBLESHOOTING.md`** - Detailed troubleshooting guide  
3. **Updated `supabaseClient.js`** - Better diagnostics
4. **Updated `webhookServer.js`** - Health check & logging

---

## 🎯 Common Issues & Fixes

### Issue: "Cannot connect to Supabase"
**Fix:** Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are exactly correct

### Issue: "relation financial_tasks does not exist"
**Fix:** Run Supabase migrations:
```bash
cd backend/supabase
supabase db push
```

### Issue: "permission denied"
**Fix:** Make sure you're using SERVICE_ROLE_KEY, not ANON_KEY

### Issue: Bot receives messages but doesn't save
**Fix:** Check health endpoint:
```bash
curl https://your-url.onrender.com/health
```

---

## 📊 Environment Variables Checklist

| Variable | Value | Required |
|----------|-------|----------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | ✅ YES |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (not anon!) | ✅ YES |
| `TELEGRAM_BOT_TOKEN` | From @BotFather | ✅ YES |
| `TELEGRAM_SECRET_TOKEN` | Any random string | ✅ YES |
| `WEBHOOK_URL` | Your Render URL | ✅ YES |
| `NODE_ENV` | `production` | ❌ Optional |

---

## 🔍 Debug Steps

If still not working:

```bash
# 1. Test locally
cd backend
npm install
node test-supabase.js

# 2. Check Render logs
# Dashboard → Logs tab, look for:
# - SUPABASE CONNECTION INFO
# - Any ❌ errors
# - Supabase test result

# 3. Check health endpoint
curl https://your-render-url.onrender.com/health

# 4. Check Telegram webhook
curl https://api.telegram.org/bot{TOKEN}/getWebhookInfo
```

---

## Expected Render Logs (Good)

```
=== SUPABASE CONNECTION INFO ===
📍 Supabase URL: ✅ Set
🔑 Service Role Key: ✅ Set
🔐 Using: Service Role Key (recommended for server)
✅ Supabase client initialized successfully

🧪 Testing Supabase connection...
✅ Supabase connection successful!

✅ Webhook server listening on port 3000
📍 Webhook URL: https://vaazhi-backend-xxxx.onrender.com/botXXX
```

---

## Next Steps

1. ✅ Update environment variables on Render
2. ✅ Restart the service
3. ✅ Check logs for success messages
4. ✅ Test health endpoint
5. ✅ Send `/start` to bot and verify response
6. ✅ Try adding a task

**If still failing**, share Render logs and I'll diagnose the exact issue!

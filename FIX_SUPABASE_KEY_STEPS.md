# Fix: Using Wrong Supabase Key (Most Common Mistake)

## 🔴 The Problem

Using **Anon Public Key** instead of **Service Role Key** causes:
- ❌ Tasks not saving
- ❌ Errors like "permission denied"
- ❌ Bot receives messages but doesn't respond
- ❌ Silent failures (no error shown)

---

## ✅ Step-by-Step Fix

### Step 1: Go to Supabase Dashboard

1. Open: https://app.supabase.com
2. Click your project (e.g., "Wealth Hub" or "Vaazhi")

### Step 2: Find API Keys

1. Click **Settings** (bottom left sidebar)
2. Click **API** (left menu)
3. You'll see this section:

```
API SETTINGS

Project URL
https://your-project-ref.supabase.co

ANON KEY (public)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBh...  ❌ DON'T USE THIS

SERVICE ROLE SECRET (private)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBh...  ✅ USE THIS ONE
```

### Step 3: Copy the RIGHT Keys

**Copy these 2 values:**

1. **Project URL** - starts with `https://`
   - Copy the ENTIRE URL
   - Example: `https://abcdefg123456.supabase.co`

2. **SERVICE ROLE SECRET** - Long JWT string under "SERVICE ROLE SECRET"
   - Click the copy icon next to it
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - ⚠️ This is PRIVATE - don't share it!

### Step 4: Go to Render Dashboard

1. Open: https://dashboard.render.com
2. Click **vaazhi-backend** service
3. Click **Settings** (top right)
4. Click **Environment** (left menu)

### Step 5: Update Environment Variables

Now you need to set 2 variables:

#### Variable 1: SUPABASE_URL
- **Key:** `SUPABASE_URL`
- **Value:** Paste the Project URL (e.g., `https://abcdefg123456.supabase.co`)
- Click **Save**

#### Variable 2: SUPABASE_SERVICE_ROLE_KEY
- **Key:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** Paste the SERVICE ROLE SECRET (the long JWT string)
- Click **Save**

### Step 6: Remove Wrong Key (if exists)

Look for this variable:
- **SUPABASE_ANON_KEY** - If it exists, **DELETE IT**

Click the 🗑️ delete button next to it.

### Step 7: Verify Environment Variables

After setting, your variables should look like:

```
SUPABASE_URL = https://abcdefg123456.supabase.co  ✅
SUPABASE_SERVICE_ROLE_KEY = eyJhb...  ✅
SUPABASE_ANON_KEY = [DELETED]  ✅
TELEGRAM_BOT_TOKEN = 123456789:ABC...  ✅
TELEGRAM_SECRET_TOKEN = my-secret-123  ✅
WEBHOOK_URL = https://vaazhi-backend-xxxx.onrender.com  ✅
```

### Step 8: Restart the Service

1. Click **Settings** (top right)
2. Scroll down
3. Click **"Restart latest deploy"** button
4. Wait 2-3 minutes for restart

### Step 9: Check Logs

1. Click **Logs** tab
2. Wait for server to start
3. Look for these SUCCESS messages:

```
=== SUPABASE CONNECTION INFO ===
📍 Supabase URL: ✅ Set
🔑 Service Role Key: ✅ Set
🔐 Using: Service Role Key (recommended for server)
✅ Supabase client initialized successfully

🧪 Testing Supabase connection...
✅ Supabase connection successful!

✅ Webhook server listening on port 3000
```

### Step 10: Test Everything

#### Test 1: Health Check
```bash
curl https://your-render-url.onrender.com/health
```

Should return:
```json
{"status":"ok","supabase":"connected"}
```

#### Test 2: Send Bot Message
1. Open Telegram
2. Send `/start` to your bot
3. Should see main menu buttons

#### Test 3: Add a Task
1. Click "Add Task" button
2. Type a task name
3. Complete the steps
4. Check Render logs for:
   ```
   💾 Saving task...
   ✅ Task saved successfully!
   ```

---

## 🎯 Quick Summary

| What | Where | Action |
|------|-------|--------|
| **Supabase URL** | Supabase → Settings → API → Project URL | Copy & paste to `SUPABASE_URL` |
| **Service Role Key** | Supabase → Settings → API → SERVICE ROLE SECRET | Copy & paste to `SUPABASE_SERVICE_ROLE_KEY` |
| **Anon Key** | (Don't use - REMOVE if exists) | Delete `SUPABASE_ANON_KEY` variable |
| **Render Service** | After saving vars | Click "Restart latest deploy" |
| **Check Logs** | Render → Logs tab | Look for ✅ success messages |

---

## ❌ Wrong Way (What NOT to Do)

```
❌ SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   This is public key - doesn't work for database writes!

❌ SUPABASE_KEY = some-random-string
   Wrong variable name!

❌ SUPABASE_URL = your-project-ref
   Wrong format - needs full URL with https://
```

---

## ✅ Correct Way

```
✅ SUPABASE_URL = https://your-project-ref.supabase.co
   Full project URL from Settings → API

✅ SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Service role secret from Settings → API
```

---

## 🆘 Still Not Working?

1. **Verify keys copied correctly:**
   - Go back to Supabase dashboard
   - Copy keys again to make sure no typos

2. **Restart service again:**
   - Sometimes needs 2 restarts
   - Click "Restart latest deploy" again

3. **Clear browser cache:**
   - Render dashboard might show old values
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

4. **Check logs for errors:**
   ```
   ❌ Cannot connect to Supabase
   ❌ permission denied
   ```
   - Copy exact error message
   - Share it for help

---

## 📸 Screenshot Locations

**In Supabase Dashboard:**
1. Click project → Settings (bottom left)
2. Click API (left menu)
3. Copy from this section:
   - Project URL (line 1)
   - Service Role Secret (scroll down)

**In Render Dashboard:**
1. Click vaazhi-backend service
2. Click Settings (top right)
3. Click Environment (left menu)
4. Add variables here

---

## ✨ You're Done!

After restart completes:
- ✅ Bot responds to `/start`
- ✅ Can add tasks
- ✅ Tasks saved to Supabase
- ✅ All features work

If you still have issues, check **SUPABASE_TROUBLESHOOTING.md** or share Render logs!

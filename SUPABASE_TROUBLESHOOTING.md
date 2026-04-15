# Supabase Connection Troubleshooting for Render

## 🆘 Bot Not Saving Tasks / Not Receiving Messages?

This guide helps you diagnose Supabase connection issues.

---

## Step 1: Check Render Logs for Supabase Status

1. Go to: https://dashboard.render.com
2. Click: **vaazhi-backend** service
3. Click: **"Logs"** tab
4. Look for startup messages:

### ✅ Good Signs (Connection Working)
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

### ❌ Bad Signs (Connection Failed)
```
❌ SUPABASE_URL is missing
❌ SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY both missing
❌ CRITICAL: Cannot connect to Supabase
```

---

## Step 2: Verify Environment Variables in Render

If you see connection errors:

1. Go to Render dashboard
2. Click: **vaazhi-backend** → **Settings**
3. Click: **Environment**
4. Check these variables are set:

| Variable | Should Be | Status |
|----------|-----------|--------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | ✅ Must exist |
| `SUPABASE_SERVICE_ROLE_KEY` | Long JWT-like string | ✅ Must exist |
| `TELEGRAM_BOT_TOKEN` | `123456789:ABCdef...` | ✅ Must exist |
| `TELEGRAM_SECRET_TOKEN` | Any random string | ✅ Must exist |
| `WEBHOOK_URL` | Your Render URL | ✅ Must exist |

### If ANY variable is missing:
1. Add it
2. Service will auto-restart
3. Check logs again

---

## Step 3: Verify Supabase Project is Working

1. Go to: https://app.supabase.com
2. Click: Your project
3. Go to: **SQL Editor**
4. Run this query:
```sql
SELECT * FROM financial_tasks LIMIT 1;
```

- ✅ If it returns data/empty table = Database is working
- ❌ If it shows error = Database problem (not Render's fault)

---

## Step 4: Test Supabase Credentials

Get your credentials from Supabase:

1. Go to: https://app.supabase.com
2. Click: Your project → **Settings** → **API**
3. Copy:
   - **Project URL** → This is `SUPABASE_URL`
   - **service_role secret** → This is `SUPABASE_SERVICE_ROLE_KEY`

### Common Mistakes:
- ❌ Using `anon public key` instead of `service_role secret`
- ❌ Using `Project Ref ID` instead of `Project URL`
- ❌ Missing protocol: should be `https://xxx.supabase.co`

---

## Step 5: Health Check Endpoint

Test Supabase connection without sending to bot:

```bash
curl https://your-render-url.onrender.com/health
```

### Expected Response
```json
{"status":"ok","supabase":"connected"}
```

### Error Response
```json
{"status":"error","supabase":"disconnected","error":"..."}
```

If error, copy the error message and check Step 2.

---

## Step 6: Check for Network/Firewall Issues

Render backend might not be able to reach Supabase if:
1. Wrong URL
2. Network firewall blocking connection
3. Supabase service down

### How to Verify:

**In local terminal, test connection to Supabase:**
```bash
curl -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR-PROJECT-REF.supabase.co/rest/v1/financial_tasks?select=count \
  -H "Prefer: count=exact&head=true"
```

If this works locally but not on Render = Render networking issue (rare)

---

## Step 7: Task-Specific Debugging

### Bot says "Cannot save task"
**Logs to look for:**
```
💾 Saving task...
🔗 Connecting to Supabase
❌ Supabase error: ...
```

**Solution:** Check the error message after `❌ Supabase error:`

Common errors:
- `relation "financial_tasks" does not exist` → Run migrations
- `permission denied` → Wrong API key
- `connection timeout` → Network issue

### Bot doesn't respond at all
**Logs to look for:**
```
[REQUESTID] 📨 Webhook received
[REQUESTID] ⏳ Processing update...
[REQUESTID] ✅ Update processed successfully
```

If you DON'T see `📨 Webhook received`:
- Telegram webhook not set correctly
- Check: `WEBHOOK_URL` and `TELEGRAM_BOT_TOKEN`

---

## Common Fix Checklist

- [ ] Supabase URL copied correctly (no typos)
- [ ] Service role key used (NOT anon key)
- [ ] All environment variables set in Render
- [ ] Service restarted after adding env vars
- [ ] Telegram bot token is correct
- [ ] Supabase project tables exist (ran migrations)
- [ ] `financial_tasks` table has all columns
- [ ] Row-level security policies don't block inserts

---

## Reset & Try Again

If still not working:

1. **Restart service in Render:**
   - Go to Settings
   - Click "Restart latest deploy"

2. **Check logs immediately:**
   - Should see startup diagnostics
   - Look for ✅ or ❌ signs

3. **Test health endpoint:**
   ```bash
   curl https://your-url.onrender.com/health
   ```

4. **Send test message to bot:**
   - Send `/start` to bot
   - Check if main menu appears

5. **Add a task and watch logs:**
   - Watch for "Saving task..." log
   - See if database error shown

---

## Still Not Working? Share These Logs

Go to Render, get last 50 lines of logs, and share:
- Startup sequence (first lines)
- Any lines with ❌ or ⚠️
- Any Supabase connection messages
- Any error messages

This will help diagnose the exact issue!

---

## Quick Reference: Env Vars to Set

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_SECRET_TOKEN=my-secret-123
WEBHOOK_URL=https://vaazhi-backend-xxxx.onrender.com
```

**Where to get each:**
- `SUPABASE_URL` → Supabase dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` → Supabase dashboard → Settings → API → "service_role secret"
- `TELEGRAM_BOT_TOKEN` → From @BotFather
- `TELEGRAM_SECRET_TOKEN` → Create any random string
- `WEBHOOK_URL` → Your Render service URL (https://service-name-xxxx.onrender.com)

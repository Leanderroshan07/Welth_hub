# Vaazhi Backend (Supabase + Telegram Bot)

This backend now includes a Telegram bot for:

- Money management
	- Add income
	- Add expense
	- Add transfer
- Task management
	- Add task
	- Add routine

## Environment variables

Create `backend/.env` with:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`
- `AUTHORIZED_TELEGRAM_USER_IDS`
- `TELEGRAM_ACCESS_KEY` or `TELEGRAM_SECRET_KEY`

`AUTHORIZED_TELEGRAM_USER_IDS` should be a comma-separated list of Telegram numeric user IDs. Only those users can use the bot.
If you want other users to get in without adding them to the ID list, set `TELEGRAM_ACCESS_KEY` and have them send that key in chat.

Example:

```env
AUTHORIZED_TELEGRAM_USER_IDS=123456789
```

## Install

```bash
cd backend
npm install
```

## Run

```bash
npm run start:bot
```

Or:

```bash
npm start
```

## Bot flow

1. User sends `/start`
2. Bot shows:
	 - Money Manage
	 - Task Manage
3. User picks module and action
4. Bot asks for fields step-by-step
5. Bot writes to Supabase tables:
	 - `ledger_entries` for money actions
	 - `financial_tasks` for task actions

## Notes

- Money entry types use: `income`, `expense`, `transfer`
- Task types use: `task`, `routine`
- User can send `/cancel` anytime to stop current input flow.
- If `AUTHORIZED_TELEGRAM_USER_IDS` is empty or missing, the bot asks for the access key instead.
- Use `/id` in the bot chat to see your Telegram user ID and username.
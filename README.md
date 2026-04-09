# Wealth Hub (Vaazhi)

Monorepo with:

- `backend`: Telegram bot + Supabase integration for money and task management
- `frontend`: React + Vite UI for cash flow and financial task workflows

## Project Structure

- `backend/`
  - Node.js bot (`src/telegramBot.js`)
  - Supabase integration (`src/supabaseClient.js`)
  - SQL schema and migrations (`supabase/`)
- `frontend/`
  - React app (`src/`)
  - Vite configuration

## Quick Start

### Backend

```bash
cd backend
npm install
npm run start:bot
```

Required env file: `backend/.env`

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`
- `AUTHORIZED_TELEGRAM_USER_IDS`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Required env file: `frontend/.env`

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Upload to GitHub

After initializing git and creating the first commit:

```bash
git remote add origin <YOUR_GITHUB_REPO_URL>
git branch -M main
git push -u origin main
```

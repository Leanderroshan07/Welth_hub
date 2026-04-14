# Deploying Vaazhi frontend

Recommended hosts: Vercel or Netlify. Both are free for small projects and integrate with Git.

1) Build locally

```bash
cd frontend
npm install
npm run build

# preview the production build locally
npm run preview
```

2) Deploy on Vercel
- Connect your GitHub repository to Vercel.
- Set the root to `/frontend` when creating the project (or use the monorepo option).
- Set environment variables (Project → Settings → Environment Variables):
  - `VITE_SUPABASE_URL` = your Supabase URL
  - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
- Build command: `npm run build`
- Output directory: `dist`

3) Deploy on Netlify
- Link Git repository and set base directory to `frontend`.
- Set build command `npm run build` and publish directory `dist`.
- Add the same environment variables in the Netlify UI.

4) Static hosting alternative
- You can also upload the `dist/` folder to any static host or serve via CDN.

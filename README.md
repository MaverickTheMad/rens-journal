# Ren's Journal — Cycle Tracker

A private, mobile-friendly cycle and symptom tracker. Logs symptoms, foods, moods, water, exercise, and sleep — all timestamped — and surfaces patterns between foods and flare-ups.

## Stack

- **Frontend:** React + Vite
- **Backend:** Supabase (Postgres)
- **Hosting:** Vercel
- **Domain:** ren.reilly.live (via Namecheap)

## Local setup

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Deploy steps

### 1. Create the Supabase project

1. Go to **supabase.com** → New Project
2. Name it `rens-journal`, US East, set a password → Create
3. Wait ~2 minutes for it to spin up
4. **SQL Editor** → paste contents of `supabase-schema.sql` → Run
5. **Project Settings → API** → copy the **Project URL** and **anon public key**

### 2. Add env vars

Locally, create `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Push to GitHub

Create a new repo at github.com (e.g. `MaverickTheMad/rens-journal`, public), then:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/MaverickTheMad/rens-journal.git
git push -u origin main
```

### 4. Deploy to Vercel

1. **vercel.com** → Add New → Project → import `rens-journal`
2. Framework: Vite (auto-detected) → Deploy
3. **Settings → Environment Variables** → add both env vars from step 2 → Save
4. Trigger a redeploy (Deployments → ⋯ → Redeploy)

### 5. Connect ren.reilly.live

**In Vercel:** Project → Settings → Domains → add `ren.reilly.live`

**In Namecheap:** Domain List → Manage `reilly.live` → Advanced DNS → add:
- Type: **CNAME**, Host: `ren`, Value: `cname.vercel-dns.com`

DNS propagates in 5–30 min. Vercel auto-issues SSL.

## Tabs

- **Log** — daily journal. Quick-add symptoms, food, mood, water, exercise. Every event timestamped. Update throughout the day, not just at end-of-day.
- **Trends** — symptom frequency, food→flare-up correlation (configurable window), symptoms by cycle phase, cycle length stats.
- **Calendar** — month view with flow color bars, phase rings, period stars, symptom dots. Tap a day for a summary.

## Notes

- Cycle phase auto-calculates from period start dates with a 28-day default that adapts to the last 3 actual cycles. Ren can override any individual day.
- All food categories and the symptom list are defined in `src/constants.js` — easy to extend.
- Correlation analysis uses a basic lift metric (rate of symptom-within-window after food vs. baseline rate). It's a heuristic; flagging 2× or higher as "strong" is rough — useful for noticing, not diagnosing.

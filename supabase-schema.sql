-- ============================================================
-- Ren's Journal — Cycle Tracker schema
-- Run this in Supabase SQL Editor (left sidebar in Supabase)
-- ============================================================

-- ---------- Daily summary (one row per day) ----------
create table if not exists cycle_days (
  date date primary key,
  flow text,                              -- none / spotting / light / medium / heavy
  cycle_phase text,                       -- menstrual / follicular / ovulation / luteal
  cycle_phase_override boolean default false,
  sleep_hours numeric,
  sleep_quality integer,                  -- 1-5
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- Period starts (drives cycle phase auto-calc) ----------
create table if not exists period_starts (
  start_date date primary key,
  created_at timestamptz default now()
);

-- ---------- Symptom events ----------
create table if not exists symptom_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  symptom text not null,
  severity integer,                       -- 1-5
  notes text,
  created_at timestamptz default now()
);
create index if not exists symptom_events_occurred_idx on symptom_events (occurred_at);
create index if not exists symptom_events_symptom_idx on symptom_events (symptom);

-- ---------- Food events ----------
create table if not exists food_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  category text not null,
  item text not null,
  notes text,
  created_at timestamptz default now()
);
create index if not exists food_events_occurred_idx on food_events (occurred_at);
create index if not exists food_events_category_idx on food_events (category);

-- ---------- Mood events ----------
create table if not exists mood_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  mood text not null,
  notes text,
  created_at timestamptz default now()
);
create index if not exists mood_events_occurred_idx on mood_events (occurred_at);

-- ---------- Water events ----------
create table if not exists water_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  amount_oz integer not null,
  created_at timestamptz default now()
);
create index if not exists water_events_occurred_idx on water_events (occurred_at);

-- ---------- Exercise events ----------
create table if not exists exercise_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  exercise_type text,
  duration_minutes integer,
  notes text,
  created_at timestamptz default now()
);
create index if not exists exercise_events_occurred_idx on exercise_events (occurred_at);

-- ============================================================
-- Row Level Security
-- ============================================================
-- Since this is a single-user (Ren) personal app behind a PIN/domain
-- and we're using the anon key only, we enable RLS and add permissive
-- policies. If you later want stricter auth, swap to Supabase Auth.
-- ============================================================

alter table cycle_days       enable row level security;
alter table period_starts    enable row level security;
alter table symptom_events   enable row level security;
alter table food_events      enable row level security;
alter table mood_events      enable row level security;
alter table water_events     enable row level security;
alter table exercise_events  enable row level security;

-- Allow anon access on each table (since the app is private to Ren).
do $$
declare t text;
begin
  for t in select unnest(array[
    'cycle_days','period_starts','symptom_events','food_events',
    'mood_events','water_events','exercise_events'
  ])
  loop
    execute format('drop policy if exists "anon all %1$s" on %1$s', t);
    execute format('create policy "anon all %1$s" on %1$s for all to anon using (true) with check (true)', t);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════
-- ADMIN + : soumissions, signalements, réglages site, à la une
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

-- ── 1. « À la une » sur les événements ──────────────────
alter table public.events add column if not exists featured boolean not null default false;

-- ── 2. Réglages du site (bandeau d'annonce) ─────────────
create table if not exists public.site_settings (
  key text primary key,
  value text default '',
  updated_at timestamptz default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "reglages lecture publique" on public.site_settings;
create policy "reglages lecture publique" on public.site_settings for select using (true);
drop policy if exists "reglages admin ecrit" on public.site_settings;
create policy "reglages admin ecrit" on public.site_settings for insert with check (public.is_admin());
drop policy if exists "reglages admin maj" on public.site_settings;
create policy "reglages admin maj" on public.site_settings for update using (public.is_admin());
insert into public.site_settings (key,value) values ('banner','') on conflict (key) do nothing;

-- ── 3. Soumissions d'événements (proposées par la communauté) ──
create table if not exists public.event_submissions (
  id bigint generated always as identity primary key,
  title text not null, date text not null, city text default '', location text default '',
  category text default 'Soirée', price text default '', organizer text default '',
  ticket_url text default '', image text default '', description text default '',
  submitter_email text default '', submitter_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table public.event_submissions enable row level security;
-- Tout le monde peut proposer ; seul l'admin lit la file et traite.
drop policy if exists "proposer un event" on public.event_submissions;
create policy "proposer un event" on public.event_submissions for insert with check (true);
drop policy if exists "admin lit les soumissions" on public.event_submissions;
create policy "admin lit les soumissions" on public.event_submissions for select using (public.is_admin());
drop policy if exists "admin traite les soumissions" on public.event_submissions;
create policy "admin traite les soumissions" on public.event_submissions for update using (public.is_admin());
drop policy if exists "admin supprime les soumissions" on public.event_submissions;
create policy "admin supprime les soumissions" on public.event_submissions for delete using (public.is_admin());

-- ── 4. Signalements de contenu ──────────────────────────
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  target_type text not null,        -- 'post' | 'post_comment' | 'event_comment'
  target_id bigint not null,
  target_excerpt text default '',    -- copie du contenu pour l'admin
  reason text default '',
  reporter_id uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
-- Un membre connecté peut signaler ; seul l'admin lit et traite.
drop policy if exists "signaler un contenu" on public.reports;
create policy "signaler un contenu" on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "admin lit les signalements" on public.reports;
create policy "admin lit les signalements" on public.reports for select using (public.is_admin());
drop policy if exists "admin traite les signalements" on public.reports;
create policy "admin traite les signalements" on public.reports for update using (public.is_admin());
drop policy if exists "admin supprime les signalements" on public.reports;
create policy "admin supprime les signalements" on public.reports for delete using (public.is_admin());

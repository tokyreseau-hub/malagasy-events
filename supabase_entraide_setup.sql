-- Table entraide (covoiturage + hébergement) pour Malagasy Events
-- À exécuter dans Supabase : Dashboard → SQL Editor → New query → coller → Run

create table if not exists public.entraide (
  id bigint generated always as identity primary key,
  event_id bigint not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('trajet','hebergement')),
  type text not null check (type in ('propose','cherche')),
  city text not null,
  places int not null default 1 check (places between 1 and 8),
  note text default '',
  created_at timestamptz not null default now()
);

alter table public.entraide enable row level security;

create policy "entraide visible par tous"
  on public.entraide for select using (true);

create policy "publier sa propre annonce"
  on public.entraide for insert with check (auth.uid() = user_id);

create policy "supprimer sa propre annonce"
  on public.entraide for delete using (auth.uid() = user_id);

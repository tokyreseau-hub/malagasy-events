-- Table covoiturage pour Malagasy Events
-- À exécuter dans Supabase : Dashboard → SQL Editor → New query → coller → Run

create table if not exists public.rides (
  id bigint generated always as identity primary key,
  event_id bigint not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('propose','cherche')),
  from_city text not null,
  seats int not null default 1 check (seats between 1 and 8),
  note text default '',
  created_at timestamptz not null default now()
);

alter table public.rides enable row level security;

create policy "rides visibles par tous"
  on public.rides for select using (true);

create policy "publier son propre trajet"
  on public.rides for insert with check (auth.uid() = user_id);

create policy "supprimer son propre trajet"
  on public.rides for delete using (auth.uid() = user_id);

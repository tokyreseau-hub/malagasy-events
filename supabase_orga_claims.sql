-- DEMANDES DE CONTRÔLE DE FICHE ORGANISATEUR — validées par l'admin
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.

create table if not exists public.orga_claims (
  id bigint generated always as identity primary key,
  orga_id bigint not null references public.organisateurs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (orga_id, user_id)
);
alter table public.orga_claims enable row level security;

drop policy if exists "demande visible par soi et admin" on public.orga_claims;
create policy "demande visible par soi et admin" on public.orga_claims for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "poser sa demande" on public.orga_claims;
create policy "poser sa demande" on public.orga_claims for insert
  with check (
    auth.uid() = user_id
    and exists(select 1 from public.profiles where id = auth.uid() and plan in ('organisateur','pro'))
  );

drop policy if exists "supprimer demande (soi ou admin)" on public.orga_claims;
create policy "supprimer demande (soi ou admin)" on public.orga_claims for delete
  using (auth.uid() = user_id or public.is_admin());

-- ⚠️ On retire la revendication directe (remplacée par la demande validée en admin)
drop policy if exists "revendiquer une fiche libre" on public.organisateurs;

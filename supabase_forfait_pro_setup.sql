-- FORFAIT ORGANISATEUR (PRO) — Malagasy Events
-- À exécuter dans Supabase APRÈS supabase_organisateurs_setup.sql

-- 1. Plan sur les organisateurs (free = fiche simple · pro = peut publier des actus)
alter table public.organisateurs add column if not exists plan text not null default 'free' check (plan in ('free','pro'));
alter table public.organisateurs add column if not exists plan_until date;

-- 2. Les établissements gastro pourront aussi être revendiqués et passer pro
alter table public.gastro add column if not exists owner_id uuid references public.profiles(id) on delete set null;
alter table public.gastro add column if not exists plan text not null default 'free' check (plan in ('free','pro'));
drop policy if exists "gastro admin update" on public.gastro;
drop policy if exists "gastro update admin ou proprietaire" on public.gastro;
create policy "gastro update admin ou proprietaire" on public.gastro for update
  using (public.is_admin() or auth.uid() = owner_id);

-- 3. Mur d'actus des organisateurs
create table if not exists public.orga_posts (
  id bigint generated always as identity primary key,
  orga_id bigint not null references public.organisateurs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text default '',
  created_at timestamptz not null default now()
);
alter table public.orga_posts enable row level security;

drop policy if exists "actus visibles par tous" on public.orga_posts;
create policy "actus visibles par tous" on public.orga_posts for select using (true);

-- Publier : admin, OU propriétaire de la fiche avec forfait pro actif
drop policy if exists "publier si pro ou admin" on public.orga_posts;
create policy "publier si pro ou admin" on public.orga_posts for insert with check (
  public.is_admin() or (
    auth.uid() = user_id and exists (
      select 1 from public.organisateurs o
      where o.id = orga_id and o.owner_id = auth.uid() and o.plan = 'pro'
        and (o.plan_until is null or o.plan_until >= current_date)
    )
  )
);

drop policy if exists "supprimer ses actus ou admin" on public.orga_posts;
create policy "supprimer ses actus ou admin" on public.orga_posts for delete
  using (public.is_admin() or auth.uid() = user_id);

-- 4. Protection : seul l'admin peut changer le forfait ou le propriétaire
--    (un orga qui modifie sa fiche ne peut pas se passer PRO lui-même)
create or replace function public.protect_plan_fields() returns trigger
language plpgsql security definer as $$
begin
  if not public.is_admin() then
    new.plan := old.plan;
    new.owner_id := old.owner_id;
    if tg_table_name = 'organisateurs' then new.plan_until := old.plan_until; end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_plan_orgas on public.organisateurs;
create trigger trg_protect_plan_orgas before update on public.organisateurs
  for each row execute function public.protect_plan_fields();

drop trigger if exists trg_protect_plan_gastro on public.gastro;
create trigger trg_protect_plan_gastro before update on public.gastro
  for each row execute function public.protect_plan_fields();

-- 5. Patch installations existantes : clé étrangère actus → organisateur
--    (les actus sont supprimées avec la fiche de leur organisateur)
alter table public.orga_posts drop constraint if exists orga_posts_orga_id_fkey;
alter table public.orga_posts add constraint orga_posts_orga_id_fkey
  foreign key (orga_id) references public.organisateurs(id) on delete cascade;

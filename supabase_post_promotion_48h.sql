-- ════════════════════════════════════════════════════════════════
-- MISE EN AVANT PREMIUM — 48 HEURES
-- Une publication Premium reste en tête du fil pendant 48 h, puis
-- retrouve automatiquement sa place chronologique normale.
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ════════════════════════════════════════════════════════════════

alter table public.posts
  add column if not exists promoted_until timestamptz;

create index if not exists posts_promoted_until_idx
  on public.posts (promoted_until desc)
  where promoted_until is not null;

-- Les publications Premium déjà créées il y a moins de 48 h bénéficient
-- du temps restant ; les publications plus anciennes reprennent le fil normal.
update public.posts p
set promoted_until = p.created_at + interval '48 hours'
from public.profiles u
where u.id = p.user_id
  and u.plan = 'pro'
  and p.created_at > now() - interval '48 hours'
  and p.promoted_until is null;

create or replace function public.set_post_promotion_duration()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    -- Le navigateur ne choisit jamais lui-même la durée ou le statut.
    if exists (
      select 1 from public.profiles
      where id = new.user_id and plan = 'pro'
    ) then
      new.promoted_until := now() + interval '48 hours';
    else
      new.promoted_until := null;
    end if;
  elsif new.promoted_until is distinct from old.promoted_until then
    -- Impossible de prolonger son propre post via l'API.
    new.promoted_until := old.promoted_until;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_post_promotion_duration on public.posts;
create trigger trg_post_promotion_duration
before insert or update on public.posts
for each row execute function public.set_post_promotion_duration();

revoke execute on function public.set_post_promotion_duration()
from public, anon, authenticated;


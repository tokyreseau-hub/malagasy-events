-- ════════════════════════════════════════════════════════════════
-- ACTUS ORGANISATEURS À LA UNE — durée de 7 jours
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- ════════════════════════════════════════════════════════════════

alter table public.orga_posts
  add column if not exists featured_until timestamptz;

create index if not exists orga_posts_featured_until_idx
  on public.orga_posts (featured_until desc);

-- Les anciennes actus restent à la une jusqu'à 7 jours après leur création.
update public.orga_posts
set featured_until = created_at + interval '7 days'
where featured_until is null;

-- Toute nouvelle actu organisateur obtient 7 jours à la une.
-- Seul l'admin peut ensuite changer cette durée.
create or replace function public.set_orga_post_featured_duration()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.featured_until := now() + interval '7 days';
  elsif not public.is_admin() then
    new.featured_until := old.featured_until;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orga_post_featured_duration on public.orga_posts;
create trigger trg_orga_post_featured_duration
  before insert or update on public.orga_posts
  for each row execute function public.set_orga_post_featured_duration();

revoke execute on function public.set_orga_post_featured_duration()
  from public, anon, authenticated;

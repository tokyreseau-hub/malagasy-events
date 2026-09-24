-- Classement public des fiches par consultations reelles.
-- A executer dans Supabase SQL Editor seulement apres validation.

create table if not exists public.page_popularity (
  page_path text primary key,
  view_count bigint not null default 0 check (view_count >= 0),
  updated_at timestamptz not null default now()
);

-- Audience sociale : seules les valeurs datees et verifiees entrent dans le classement.
-- Les colonnes fb et insta existantes restent les liens publics affiches sur la fiche.
alter table public.organisateurs
  add column if not exists audience_facebook bigint check (audience_facebook is null or audience_facebook >= 0),
  add column if not exists audience_instagram bigint check (audience_instagram is null or audience_instagram >= 0),
  add column if not exists audience_total bigint generated always as
    (coalesce(audience_facebook, 0) + coalesce(audience_instagram, 0)) stored,
  add column if not exists audience_checked_at timestamptz,
  add column if not exists audience_source text,
  add column if not exists audience_verified boolean not null default false;

comment on column public.organisateurs.audience_verified is
  'True seulement apres controle manuel des liens publics et de la date de verification.';

alter table public.page_popularity enable row level security;

drop policy if exists "public read page popularity" on public.page_popularity;
create policy "public read page popularity"
on public.page_popularity for select
to anon, authenticated
using (true);

revoke all on public.page_popularity from public;
grant select on public.page_popularity to anon, authenticated;

create schema if not exists private;

-- Anti-gonflement : un même visiteur ne compte qu'une fois par fiche et par jour.
-- Cette table reste dans le schema prive et n'est pas exposee par la Data API.
create table if not exists private.page_popularity_daily_visitors (
  page_path text not null,
  visitor_key uuid not null,
  visit_date date not null,
  primary key (page_path, visitor_key, visit_date)
);

revoke all on table private.page_popularity_daily_visitors from public, anon, authenticated;

create or replace function private.increment_page_popularity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_name = 'page_view'
     and new.page_path ~ '^/(evenement|restaurant|traiteur|professionnel|sportif)/'
     and coalesce(new.visitor_id, new.session_id) is not null then
    insert into private.page_popularity_daily_visitors(page_path, visitor_key, visit_date)
    values(new.page_path, coalesce(new.visitor_id, new.session_id), new.created_at::date)
    on conflict do nothing;

    if found then
      insert into public.page_popularity(page_path, view_count, updated_at)
      values (new.page_path, 1, now())
      on conflict (page_path) do update
        set view_count = public.page_popularity.view_count + 1,
            updated_at = now();
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.increment_page_popularity() from public, anon, authenticated;

drop trigger if exists analytics_page_popularity_after_insert on public.analytics_events;
create trigger analytics_page_popularity_after_insert
after insert on public.analytics_events
for each row execute function private.increment_page_popularity();

-- Reconstitue l'historique avec la même règle anti-doublon.
insert into private.page_popularity_daily_visitors(page_path, visitor_key, visit_date)
select distinct page_path, coalesce(visitor_id, session_id), created_at::date
from public.analytics_events
where event_name = 'page_view'
  and page_path ~ '^/(evenement|restaurant|traiteur|professionnel|sportif)/'
  and coalesce(visitor_id, session_id) is not null
on conflict do nothing;

delete from public.page_popularity
where page_path ~ '^/(evenement|restaurant|traiteur|professionnel|sportif)/';

insert into public.page_popularity(page_path, view_count, updated_at)
select page_path, count(*), now()
from private.page_popularity_daily_visitors
group by page_path
on conflict (page_path) do update
set view_count = excluded.view_count,
    updated_at = now();

-- Verification apres execution :
-- select * from public.page_popularity order by view_count desc limit 20;

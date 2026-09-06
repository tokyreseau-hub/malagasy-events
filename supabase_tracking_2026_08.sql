-- MALAGASY EVENTS — TRACKING DES VISITES ET CLICS
-- À exécuter dans Supabase > SQL Editor après le script Super Admin.

create extension if not exists pgcrypto;

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null check(event_name in ('page_view','outbound_social_click','outbound_link_click')),
  page_path text not null default '/',
  page_title text not null default '',
  landing_path text not null default '',
  session_id uuid,
  source text not null default 'direct',
  medium text not null default 'none',
  campaign text not null default '',
  content text not null default '',
  destination_host text not null default '',
  destination_url text not null default '',
  link_label text not null default '',
  platform text not null default '',
  created_at timestamptz not null default now(),
  constraint analytics_safe_lengths check(
    char_length(page_path)<=500 and char_length(page_title)<=200 and
    char_length(landing_path)<=500 and char_length(source)<=80 and
    char_length(medium)<=80 and char_length(campaign)<=120 and
    char_length(content)<=120 and char_length(destination_host)<=200 and
    char_length(destination_url)<=800 and char_length(link_label)<=200
  )
);

create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_source_idx on public.analytics_events(source,created_at desc);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name,created_at desc);
create index if not exists analytics_events_campaign_idx on public.analytics_events(campaign,created_at desc) where campaign<>'';

alter table public.analytics_events enable row level security;
drop policy if exists "public append anonymous analytics" on public.analytics_events;
drop policy if exists "admins read analytics" on public.analytics_events;

create policy "public append anonymous analytics" on public.analytics_events
for insert to anon,authenticated
with check(
  session_id is not null
  and source !~* '(email|@|telephone|phone)'
  and campaign !~* '(email|@|telephone|phone)'
);

create policy "admins read analytics" on public.analytics_events
for select to authenticated using(public.is_admin());

grant insert on public.analytics_events to anon,authenticated;
grant select on public.analytics_events to authenticated;
grant usage,select on sequence public.analytics_events_id_seq to anon,authenticated;

comment on table public.analytics_events is
'Mesure interne sans cookie publicitaire : pages vues, attribution UTM et clics externes. Aucune identité, adresse e-mail ou adresse IP stockée dans cette table.';

-- Nettoyage manuel possible après 13 mois. À lancer périodiquement depuis SQL Editor.
create or replace function public.purge_old_analytics()
returns bigint language plpgsql security definer set search_path=public,pg_temp
as $$
declare deleted_count bigint;
begin
  if not public.is_super_admin() then raise exception 'Accès refusé'; end if;
  delete from public.analytics_events where created_at < now()-interval '13 months';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end $$;
revoke all on function public.purge_old_analytics() from public;
grant execute on function public.purge_old_analytics() to authenticated;

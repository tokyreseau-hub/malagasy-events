-- Malagasy Events — socle conformité / droits / autorisations
-- À exécuter une fois dans Supabase SQL Editor.

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid null references auth.users(id) on delete set null,
  requester_email text not null,
  request_type text not null check (request_type in (
    'access','rectification','opposition','erasure','portability',
    'claim','content','appeal'
  )),
  subject text not null default '',
  details text not null,
  status text not null default 'received' check (status in (
    'received','identity_check','in_progress','completed','rejected'
  )),
  internal_notes text not null default '',
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.privacy_requests enable row level security;

drop policy if exists "privacy request public insert" on public.privacy_requests;
create policy "privacy request public insert"
on public.privacy_requests for insert
to anon, authenticated
with check (
  char_length(requester_email) between 5 and 254
  and char_length(details) between 10 and 5000
  and (requester_id is null or requester_id = auth.uid())
);

drop policy if exists "privacy request own read" on public.privacy_requests;
create policy "privacy request own read"
on public.privacy_requests for select
to authenticated
using (requester_id = auth.uid());

drop policy if exists "privacy request admin manage" on public.privacy_requests;
create policy "privacy request admin manage"
on public.privacy_requests for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.username = 'Malagasy_events_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.username = 'Malagasy_events_admin'
  )
);

create index if not exists privacy_requests_status_created_idx
on public.privacy_requests(status, created_at desc);

-- Registre des droits permettant de réactiver un visuel événementiel.
create table if not exists public.event_visual_licenses (
  id uuid primary key default gen_random_uuid(),
  event_id bigint null,
  visual_url text not null,
  rights_holder text not null,
  permission_scope text not null,
  proof_reference text not null,
  valid_from date,
  valid_until date,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.event_visual_licenses enable row level security;

drop policy if exists "visual licenses admin only" on public.event_visual_licenses;
create policy "visual licenses admin only"
on public.event_visual_licenses for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.username = 'Malagasy_events_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.username = 'Malagasy_events_admin'
  )
);

-- Journal minimal des décisions de modération.
create table if not exists public.moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id bigint null,
  target_type text not null,
  target_id text not null,
  decision text not null,
  legal_or_cgu_basis text not null,
  public_reason text not null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz not null default now(),
  appealed_at timestamptz,
  appeal_outcome text
);

alter table public.moderation_decisions enable row level security;

drop policy if exists "moderation decisions admin only" on public.moderation_decisions;
create policy "moderation decisions admin only"
on public.moderation_decisions for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.username = 'Malagasy_events_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.username = 'Malagasy_events_admin'
  )
);

comment on table public.privacy_requests is
'Demandes RGPD, revendications de fiches, signalements de droits et recours.';
comment on table public.event_visual_licenses is
'Preuves d’autorisation nécessaires avant diffusion d’une affiche ou photo événementielle.';
comment on table public.moderation_decisions is
'Journal interne des décisions de modération et de leurs motifs.';

-- Mise en quarantaine réversible des affiches actuellement enregistrées.
-- Les URL sont conservées ici pour audit, mais ne sont plus exposées par les
-- fiches publiques. Ne restaurer qu'après création d'une licence vérifiée.
create table if not exists public.event_visuals_quarantine (
  source_table text not null,
  source_id text not null,
  visual_url text not null,
  quarantined_at timestamptz not null default now(),
  primary key (source_table, source_id, visual_url)
);

alter table public.event_visuals_quarantine enable row level security;

drop policy if exists "visual quarantine admin only" on public.event_visuals_quarantine;
create policy "visual quarantine admin only"
on public.event_visuals_quarantine for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.username = 'Malagasy_events_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.username = 'Malagasy_events_admin'
  )
);

insert into public.event_visuals_quarantine(source_table, source_id, visual_url)
select 'events', id::text, image
from public.events
where coalesce(image, '') <> ''
on conflict do nothing;

insert into public.event_visuals_quarantine(source_table, source_id, visual_url)
select 'event_submissions', id::text, image
from public.event_submissions
where coalesce(image, '') <> ''
on conflict do nothing;

update public.events set image = '' where coalesce(image, '') <> '';
update public.event_submissions set image = '' where coalesce(image, '') <> '';

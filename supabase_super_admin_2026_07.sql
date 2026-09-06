-- MALAGASY EVENTS — SUPER ADMIN + CONFORMITÉ
-- À exécuter dans Supabase > SQL Editor.
-- Réexécutable : les créations et politiques sont idempotentes.

create extension if not exists pgcrypto;

-- 1. Rôles d'administration robustes (le pseudo seul n'est plus la source de vérité).
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('super_admin','admin','moderator','analyst')),
  capabilities jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.admin_roles(user_id,role,capabilities)
select id,'super_admin','{"all":true}'::jsonb from public.profiles
where username='Malagasy_events_admin'
on conflict(user_id) do update set role='super_admin',active=true,capabilities='{"all":true}'::jsonb,updated_at=now();

create or replace function public.is_super_admin()
returns boolean language sql stable security definer
set search_path=public,pg_temp
as $$ select exists(select 1 from public.admin_roles where user_id=auth.uid() and active and role='super_admin') $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path=public,pg_temp
as $$
  select public.is_super_admin() or exists(
    select 1 from public.admin_roles where user_id=auth.uid() and active and role in ('admin','moderator')
  )
$$;

revoke all on function public.is_super_admin() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_super_admin(),public.is_admin() to authenticated;

alter table public.admin_roles enable row level security;
drop policy if exists "super admins manage admin roles" on public.admin_roles;
create policy "super admins manage admin roles" on public.admin_roles for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

-- 2. Journal d'audit immuable depuis l'application.
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null default auth.uid(),
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
alter table public.admin_audit_log enable row level security;
drop policy if exists "admins read audit" on public.admin_audit_log;
drop policy if exists "admins append audit" on public.admin_audit_log;
create policy "admins read audit" on public.admin_audit_log for select to authenticated using(public.is_admin());
create policy "admins append audit" on public.admin_audit_log for insert to authenticated with check(public.is_admin() and actor_id=auth.uid());

-- 3. Tâches internes du centre de contrôle.
create table if not exists public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(title) between 2 and 300),
  description text not null default '',
  status text not null default 'todo' check(status in ('todo','doing','done','cancelled')),
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_tasks enable row level security;
drop policy if exists "admins manage tasks" on public.admin_tasks;
create policy "admins manage tasks" on public.admin_tasks for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- 4. Socle RGPD et droits (complète le script légal précédent s'il a déjà été exécuté).
create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users(id) on delete set null,
  requester_email text not null,
  request_type text not null,
  subject text not null default '',
  details text not null,
  status text not null default 'received',
  internal_notes text not null default '',
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.privacy_requests add column if not exists updated_at timestamptz not null default now();
alter table public.privacy_requests add column if not exists completed_at timestamptz;
alter table public.privacy_requests enable row level security;
drop policy if exists "privacy request admin manage" on public.privacy_requests;
create policy "privacy request admin manage" on public.privacy_requests for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create table if not exists public.event_visual_licenses (
  id uuid primary key default gen_random_uuid(),
  event_id bigint,
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
alter table public.event_visual_licenses add column if not exists status text not null default 'pending';
alter table public.event_visual_licenses enable row level security;
drop policy if exists "visual licenses admin only" on public.event_visual_licenses;
create policy "visual licenses admin only" on public.event_visual_licenses for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create table if not exists public.event_visuals_quarantine (
  source_table text not null,
  source_id text not null,
  visual_url text not null,
  quarantined_at timestamptz not null default now(),
  primary key(source_table,source_id,visual_url)
);
alter table public.event_visuals_quarantine enable row level security;
drop policy if exists "visual quarantine admin only" on public.event_visuals_quarantine;
create policy "visual quarantine admin only" on public.event_visuals_quarantine for all to authenticated
using(public.is_admin()) with check(public.is_admin());

-- 5. Pouvoir complet sur les données de l'application, uniquement pour le super-admin.
-- Aucun accès n'est accordé aux mots de passe, secrets, clés API ou jetons.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','events','event_submissions','reports','site_settings','posts','post_comments',
    'comments','messages','orga_messages','follows','orga_follows','event_interests',
    'favorites','email_reminders','organisateurs','gastro','lieux','videos','entraide',
    'orga_posts','perks','orga_claims','tickets','notifications','blocks'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security',t);
      execute format('drop policy if exists "super admin full access" on public.%I',t);
      execute format(
        'create policy "super admin full access" on public.%I for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin())',t
      );
    end if;
  end loop;
end $$;

-- 6. Statistiques serveur consolidées.
create or replace function public.super_admin_stats()
returns jsonb language plpgsql stable security definer
set search_path=public,pg_temp
as $$
declare result jsonb := '{}'::jsonb; t text; n bigint;
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  foreach t in array array['profiles','events','posts','post_comments','messages','follows',
    'organisateurs','gastro','lieux','videos','reports','event_submissions','privacy_requests']
  loop
    if to_regclass('public.'||t) is not null then
      execute format('select count(*) from public.%I',t) into n;
      result := result || jsonb_build_object(t,n);
    end if;
  end loop;
  return result;
end $$;
revoke all on function public.super_admin_stats() from public;
grant execute on function public.super_admin_stats() to authenticated;

insert into public.admin_audit_log(action,target_type,target_id,details)
values('super_admin_setup','system','malagasy-events','{"version":"2026-07","status":"installed"}'::jsonb);

comment on table public.admin_roles is 'Rôles et capacités administratives. Ne jamais y stocker de secret.';
comment on table public.admin_audit_log is 'Journal des actions sensibles, en lecture/ajout uniquement depuis le client.';

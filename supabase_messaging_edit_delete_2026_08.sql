-- ═══════════════════════════════════════════════════════════════════════════
-- MALAGASY EVENTS — LOT UNIQUE : MESSAGERIE + SOURCES OFFICIELLES
-- À exécuter une seule fois dans Supabase > SQL Editor > Run.
-- Réexécutable. Ne supprime aucun message existant et ne programme aucune purge.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- 1. Liens propres à chaque événement.
alter table public.events add column if not exists official_source_url text not null default '';
alter table public.events add column if not exists updates_url text not null default '';
alter table public.events add column if not exists links_verified_at timestamptz;
alter table public.events add column if not exists links_verified_by uuid references auth.users(id) on delete set null;

alter table public.event_submissions add column if not exists official_source_url text not null default '';
alter table public.event_submissions add column if not exists updates_url text not null default '';

-- Les anciennes pages Facebook/Madatsara rangées dans ticketUrl deviennent
-- des sources d'information. Une vraie billetterie reste dans ticketUrl.
update public.events
set official_source_url = "ticketUrl", "ticketUrl" = ''
where coalesce(official_source_url,'') = ''
  and coalesce("ticketUrl",'') <> ''
  and "ticketUrl" ~* '^https?://([^/]+\.)?(facebook\.com|instagram\.com|madatsara\.com)(/|$)';

-- 2. Suppression logique et fenêtre de modification.
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table public.messages add column if not exists deleted_for_everyone boolean not null default false;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.message_archive (
  id bigint generated always as identity primary key,
  message_id uuid not null,
  sender_id uuid,
  recipient_id uuid,
  content text not null default '',
  action text not null check (action in ('created','edited','deleted','physical_delete')),
  captured_at timestamptz not null default now(),
  retention_until timestamptz,
  legal_hold boolean not null default false,
  legal_hold_reason text not null default ''
);
create index if not exists message_archive_message_idx on private.message_archive(message_id,captured_at desc);
drop index if exists private.message_archive_retention_idx;

-- Une version antérieure du lot prévoyait une expiration. Elle est neutralisée :
-- NULL signifie que l'archive est conservée sans date d'expiration automatique.
alter table private.message_archive alter column retention_until drop not null;
alter table private.message_archive alter column retention_until drop default;
update private.message_archive set retention_until = null where retention_until is not null;

create table if not exists private.message_archive_access_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

revoke all on private.message_archive from public, anon, authenticated;
revoke all on private.message_archive_access_log from public, anon, authenticated;

-- Protéger également les messages déjà présents avant l'installation du trigger.
insert into private.message_archive(message_id,sender_id,recipient_id,content,action)
select m.id,m.sender_id,m.recipient_id,m.content,'created'
from public.messages m
where not exists (
  select 1 from private.message_archive a
  where a.message_id=m.id and a.action='created'
);

create or replace function private.archive_message_version()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare archive_action text;
begin
  if tg_op = 'INSERT' then
    insert into private.message_archive(message_id,sender_id,recipient_id,content,action)
    values(new.id,new.sender_id,new.recipient_id,new.content,'created');
    return new;
  elsif tg_op = 'UPDATE' then
    archive_action := case when new.deleted_at is not null and old.deleted_at is null then 'deleted' else 'edited' end;
    if old.content is distinct from new.content or old.deleted_at is distinct from new.deleted_at then
      insert into private.message_archive(message_id,sender_id,recipient_id,content,action)
      values(old.id,old.sender_id,old.recipient_id,old.content,archive_action);
    end if;
    return new;
  else
    insert into private.message_archive(message_id,sender_id,recipient_id,content,action)
    values(old.id,old.sender_id,old.recipient_id,old.content,'physical_delete');
    return old;
  end if;
end;
$$;
revoke all on function private.archive_message_version() from public, anon, authenticated;

drop trigger if exists archive_message_insert on public.messages;
create trigger archive_message_insert after insert on public.messages
for each row execute function private.archive_message_version();
drop trigger if exists archive_message_update on public.messages;
create trigger archive_message_update after update on public.messages
for each row execute function private.archive_message_version();
drop trigger if exists archive_message_delete on public.messages;
create trigger archive_message_delete before delete on public.messages
for each row execute function private.archive_message_version();

alter table public.messages enable row level security;

create index if not exists messages_sender_created_idx on public.messages(sender_id,created_at desc);
create index if not exists messages_recipient_created_idx on public.messages(recipient_id,created_at desc);

-- Politiques minimales : chaque membre voit uniquement ses propres échanges.
drop policy if exists "read own messages" on public.messages;
drop policy if exists "lire ses messages" on public.messages;
drop policy if exists "super admin full access" on public.messages;
create policy "lire ses messages" on public.messages for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

drop policy if exists "insert message" on public.messages;
drop policy if exists "envoyer un message" on public.messages;
create policy "envoyer un message" on public.messages for insert to authenticated
with check ((select auth.uid()) = sender_id);

drop policy if exists "update own messages" on public.messages;

drop policy if exists "marquer lu" on public.messages;
create policy "marquer lu" on public.messages for update to authenticated
using ((select auth.uid()) = recipient_id)
with check ((select auth.uid()) = recipient_id);

drop policy if exists "modifier son message" on public.messages;
create policy "modifier son message" on public.messages for update to authenticated
using ((select auth.uid()) = sender_id)
with check ((select auth.uid()) = sender_id);

-- Plus aucune suppression physique par un membre.
drop policy if exists "supprimer ses conversations" on public.messages;
drop policy if exists "supprimer son message" on public.messages;

create or replace function public.guard_message_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;

  if auth.uid() = old.sender_id then
    if old.deleted_at is not null then raise exception 'Un message supprimé ne peut plus être modifié'; end if;
    if (to_jsonb(new) - array['content','edited_at','deleted_at','deleted_by','deleted_for_everyone'])
       is distinct from
       (to_jsonb(old) - array['content','edited_at','deleted_at','deleted_by','deleted_for_everyone']) then
      raise exception 'Champs du message non modifiables';
    end if;

    if new.deleted_at is not null then
      if new.deleted_by is distinct from auth.uid() or new.deleted_for_everyone is distinct from true then
        raise exception 'Suppression non autorisée';
      end if;
      new.content := '';
      return new;
    end if;

    if now() > old.created_at + interval '30 minutes' then
      raise exception 'Le délai de modification de 30 minutes est dépassé';
    end if;
    if new.deleted_by is not null or new.deleted_for_everyone then raise exception 'Suppression invalide'; end if;
    new.content := btrim(new.content);
    if new.content is null or char_length(new.content) = 0 or char_length(new.content) > 4000 then
      raise exception 'Le message doit contenir entre 1 et 4000 caractères';
    end if;
    new.edited_at := now();
    return new;
  end if;

  if auth.uid() = old.recipient_id then
    if (to_jsonb(new) - 'read') is distinct from (to_jsonb(old) - 'read') or new.read is distinct from true then
      raise exception 'Le destinataire peut uniquement marquer le message comme lu';
    end if;
    return new;
  end if;

  raise exception 'Modification non autorisée';
end;
$$;
revoke all on function public.guard_message_update() from public;
grant execute on function public.guard_message_update() to authenticated;

drop trigger if exists guard_message_update_trigger on public.messages;
create trigger guard_message_update_trigger before update on public.messages
for each row execute function public.guard_message_update();

-- 3. Consultation réservée au super-administrateur et obligatoirement tracée.
create or replace function public.admin_message_archive(limit_count integer default 200)
returns table(
  archive_id bigint,message_id uuid,sender_id uuid,recipient_id uuid,content text,
  action text,captured_at timestamptz,retention_until timestamptz,legal_hold boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not public.is_super_admin() then raise exception 'Accès réservé au super-administrateur'; end if;
  insert into private.message_archive_access_log(actor_id,action,reason)
  values(auth.uid(),'read_archive','Consultation depuis le centre de contrôle');
  return query
  select a.id,a.message_id,a.sender_id,a.recipient_id,a.content,a.action,a.captured_at,a.retention_until,a.legal_hold
  from private.message_archive a order by a.captured_at desc limit greatest(1,least(coalesce(limit_count,200),500));
end;
$$;
revoke all on function public.admin_message_archive(integer) from public, anon;
grant execute on function public.admin_message_archive(integer) to authenticated;

create or replace function public.set_message_archive_legal_hold(target_message_id uuid,active boolean,reason text)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare affected integer;
begin
  if not public.is_super_admin() then raise exception 'Accès réservé au super-administrateur'; end if;
  if active and char_length(btrim(coalesce(reason,''))) < 5 then raise exception 'Un motif précis est obligatoire'; end if;
  update private.message_archive set legal_hold=active,legal_hold_reason=case when active then btrim(reason) else '' end
  where message_id=target_message_id;
  get diagnostics affected = row_count;
  insert into private.message_archive_access_log(actor_id,action,reason)
  values(auth.uid(),case when active then 'legal_hold_on' else 'legal_hold_off' end,btrim(coalesce(reason,'')));
  return affected;
end;
$$;
revoke all on function public.set_message_archive_legal_hold(uuid,boolean,text) from public, anon;
grant execute on function public.set_message_archive_legal_hold(uuid,boolean,text) to authenticated;

-- Retirer toute ancienne purge automatique éventuellement installée.
do $$
declare purge_job_id bigint;
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    execute 'select jobid from cron.job where jobname=''malagasy_events_message_archive_purge'' limit 1' into purge_job_id;
    if purge_job_id is not null then
      perform cron.unschedule(purge_job_id);
    end if;
  end if;
end;
$$;

drop function if exists private.purge_message_archive();

commit;

-- Résumé de contrôle. Toutes les valeurs doivent être true.
select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='official_source_url') as liens_evenements_prets,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='messages' and column_name='deleted_at') as suppression_logique_prete,
  to_regclass('private.message_archive') is not null as archive_privee_prete,
  exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='admin_message_archive') as consultation_super_admin_prete,
  to_regprocedure('private.purge_message_archive()') is null as aucune_purge_automatique,
  not exists(select 1 from pg_policies where schemaname='public' and tablename='messages' and cmd='DELETE') as aucune_suppression_physique_membre;

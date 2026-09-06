-- ════════════════════════════════════════════════════════════════
-- MESSAGERIE — anti-double envoi, modification et suppression
-- Lot unique à exécuter dans Supabase → SQL Editor → Run.
-- Ne supprime aucun message existant. Relançable sans risque.
-- ════════════════════════════════════════════════════════════════

begin;

alter table public.messages enable row level security;

-- Le destinataire peut uniquement marquer les messages reçus comme lus.
drop policy if exists "marquer lu" on public.messages;
create policy "marquer lu" on public.messages
  for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- L'auteur peut modifier uniquement ses propres messages.
drop policy if exists "modifier son message" on public.messages;
create policy "modifier son message" on public.messages
  for update to authenticated
  using ((select auth.uid()) = sender_id)
  with check ((select auth.uid()) = sender_id);

-- Une suppression individuelle appartient uniquement à l'auteur.
-- Cette règle remplace l'ancienne règle qui permettait à un participant
-- de supprimer les messages écrits par l'autre personne.
drop policy if exists "supprimer ses conversations" on public.messages;
drop policy if exists "supprimer son message" on public.messages;
create policy "supprimer son message" on public.messages
  for delete to authenticated
  using ((select auth.uid()) = sender_id);

-- Les politiques décident quelles lignes sont accessibles. Ce garde-fou
-- empêche aussi de détourner une modification pour changer l'expéditeur,
-- le destinataire, la date ou tout autre champ du message.
create or replace function public.guard_message_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if auth.uid() = old.sender_id then
    if (to_jsonb(new) - 'content') is distinct from (to_jsonb(old) - 'content') then
      raise exception 'Seul le contenu de votre message peut être modifié';
    end if;
    new.content := btrim(new.content);
    if new.content is null or char_length(new.content) = 0 or char_length(new.content) > 4000 then
      raise exception 'Le message doit contenir entre 1 et 4000 caractères';
    end if;
    return new;
  end if;

  if auth.uid() = old.recipient_id then
    if (to_jsonb(new) - 'read') is distinct from (to_jsonb(old) - 'read')
       or new.read is distinct from true then
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
create trigger guard_message_update_trigger
before update on public.messages
for each row execute function public.guard_message_update();

commit;

-- Vérification lisible : les trois règles et le garde-fou doivent apparaître.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'messages'
  and policyname in ('marquer lu', 'modifier son message', 'supprimer son message')
order by policyname;

select trigger_name
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'messages'
  and trigger_name = 'guard_message_update_trigger';

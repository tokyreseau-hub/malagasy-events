-- ════════════════════════════════════════════════════════════════
-- ENTRAIDE — édition + notifications — Malagasy Events
-- À coller dans Supabase → SQL Editor → Run. Idempotent.
-- Complète supabase_corrections_toky.sql (likes + commentaires).
-- ════════════════════════════════════════════════════════════════

-- 1. Modifier son annonce d'entraide
drop policy if exists "entraide modifier" on public.entraide;
create policy "entraide modifier" on public.entraide for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Modifier son commentaire d'entraide
drop policy if exists "entraide comm modifier" on public.entraide_comments;
create policy "entraide comm modifier" on public.entraide_comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Notifier l'auteur de l'annonce quand quelqu'un commente
--    (même modèle security definer que notify_on_message / notify_on_post)
create or replace function public.notify_on_entraide_comment()
returns trigger language plpgsql security definer as $$
declare v_author uuid; v_actor_name text;
begin
  select user_id into v_author from public.entraide where id = new.entraide_id;
  if v_author is null or v_author = new.user_id then
    return new; -- pas de notif si on commente sa propre annonce
  end if;
  select coalesce(username,'Un membre') into v_actor_name from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, actor_id, type, title, body, link)
  values (v_author, new.user_id, 'post', 'Nouveau commentaire sur ton annonce d''entraide',
          v_actor_name || ' a répondu à ton annonce.', '/');
  return new;
end $$;

drop trigger if exists trg_notify_entraide_comment on public.entraide_comments;
create trigger trg_notify_entraide_comment after insert on public.entraide_comments
  for each row execute function public.notify_on_entraide_comment();

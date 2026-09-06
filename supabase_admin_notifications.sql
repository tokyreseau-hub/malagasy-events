-- ════════════════════════════════════════════════════════════════
-- NOTIFICATIONS ADMIN — Malagasy Events
-- L'admin (compte « Malagasy_events_admin ») est prévenu des
-- événements soumis, des signalements et des nouvelles annonces
-- d'entraide. Même modèle security definer que tes autres triggers.
-- À coller dans Supabase → SQL Editor → Run. Idempotent.
-- ════════════════════════════════════════════════════════════════

-- Helper : id du profil admin
create or replace function public.admin_profile_id()
returns uuid language sql stable as $$
  select id from public.profiles where username = 'Malagasy_events_admin' limit 1
$$;

-- 1. Nouvel événement soumis → notifier l'admin
create or replace function public.notify_admin_submission()
returns trigger language plpgsql security definer as $$
declare v_admin uuid;
begin
  v_admin := public.admin_profile_id();
  if v_admin is not null then
    insert into public.notifications (user_id, actor_id, type, title, body, link)
    values (v_admin, new.submitter_id, 'post', 'Nouvel événement à valider',
            coalesce(new.title,'Un événement') || ' — ' || coalesce(new.city,''), '/');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_admin_submission on public.event_submissions;
create trigger trg_notify_admin_submission after insert on public.event_submissions
  for each row execute function public.notify_admin_submission();

-- 2. Nouveau signalement → notifier l'admin
create or replace function public.notify_admin_report()
returns trigger language plpgsql security definer as $$
declare v_admin uuid;
begin
  v_admin := public.admin_profile_id();
  if v_admin is not null then
    insert into public.notifications (user_id, actor_id, type, title, body, link)
    values (v_admin, new.reporter_id, 'post', 'Nouveau signalement',
            'Contenu signalé : ' || coalesce(left(new.target_excerpt,80),new.target_type), '/');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_admin_report on public.reports;
create trigger trg_notify_admin_report after insert on public.reports
  for each row execute function public.notify_admin_report();

-- 3. Nouvelle annonce d'entraide → notifier l'admin (veille communauté)
create or replace function public.notify_admin_entraide()
returns trigger language plpgsql security definer as $$
declare v_admin uuid;
begin
  v_admin := public.admin_profile_id();
  if v_admin is not null and v_admin <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, title, body, link)
    values (v_admin, new.user_id, 'post', 'Nouvelle annonce d''entraide',
            coalesce(new.category,'entraide') || ' · ' || coalesce(new.city,''), '/');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_admin_entraide on public.entraide;
create trigger trg_notify_admin_entraide after insert on public.entraide
  for each row execute function public.notify_admin_entraide();

-- 4. Demande pour rejoindre l'équipe d'une organisation (orga_claims)
--    → notifie le propriétaire de l'établissement ET l'admin
create or replace function public.notify_on_orga_claim()
returns trigger language plpgsql security definer as $$
declare v_admin uuid; v_owner uuid; v_orga text; v_actor text;
begin
  select owner_id, name into v_owner, v_orga from public.organisateurs where id = new.orga_id;
  select coalesce(username,'Un membre') into v_actor from public.profiles where id = new.user_id;
  v_admin := public.admin_profile_id();
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, title, body, link)
    values (v_owner, new.user_id, 'follow', 'Demande pour rejoindre ton équipe',
            v_actor || ' souhaite rejoindre « ' || coalesce(v_orga,'ton organisation') || ' ».', '/');
  end if;
  if v_admin is not null and v_admin <> new.user_id and v_admin is distinct from v_owner then
    insert into public.notifications (user_id, actor_id, type, title, body, link)
    values (v_admin, new.user_id, 'follow', 'Demande d''affiliation à une organisation',
            v_actor || ' demande à rejoindre « ' || coalesce(v_orga,'une organisation') || ' ».', '/');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_orga_claim on public.orga_claims;
create trigger trg_notify_orga_claim after insert on public.orga_claims
  for each row execute function public.notify_on_orga_claim();

revoke execute on function public.notify_admin_submission() from public, anon, authenticated;
revoke execute on function public.notify_admin_report() from public, anon, authenticated;
revoke execute on function public.notify_admin_entraide() from public, anon, authenticated;
revoke execute on function public.notify_on_orga_claim() from public, anon, authenticated;

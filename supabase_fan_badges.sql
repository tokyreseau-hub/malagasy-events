-- ════════════════════════════════════════════════════════════════
-- BADGES FANS (malagasy) — Malagasy Events  (version robuste)
-- Ne touche que les tables réellement présentes (ignore les absentes).
-- 🌱 Vahiny · 🎶 Mpankafy · 🔥 Mpankafy Mafana · 👑 Ray aman-dReny
-- À exécuter APRÈS supabase_member_plans.sql. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

-- 1. Colonnes : points accumulés + override manuel
alter table public.profiles add column if not exists fan_points integer not null default 0;
alter table public.profiles add column if not exists fan_badge  text;  -- null = auto ; sinon 'vahiny'|'mpankafy'|'mafana'|'ray'

-- 2. Protéger l'override manuel (seul l'admin le change)
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer as $f$
begin
  if not public.is_admin() then
    if new.username is distinct from old.username and old.username is not null then
      new.username := old.username;
    end if;
    if to_jsonb(new) ? 'is_member' then new.is_member := old.is_member; end if;
    if to_jsonb(new) ? 'plan'      then new.plan      := old.plan;      end if;
    if to_jsonb(new) ? 'fan_badge' then new.fan_badge := old.fan_badge; end if;
  end if;
  return new;
end $f$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 3. Fonction d'attribution des points (post=+3, commentaire=+1, intérêt=+1)
create or replace function public.award_fan_points() returns trigger
language plpgsql security definer as $f$
declare pts integer;
begin
  pts := case tg_table_name
           when 'posts' then 3
           when 'post_comments' then 1
           when 'comments' then 1
           when 'event_interests' then 1
           else 1 end;
  if new.user_id is not null then
    update public.profiles set fan_points = coalesce(fan_points,0) + pts where id = new.user_id;
  end if;
  return new;
end $f$;

-- 4. Déclencheurs uniquement sur les tables qui existent
do $$
begin
  if to_regclass('public.posts') is not null then
    drop trigger if exists trg_fan_points_posts on public.posts;
    create trigger trg_fan_points_posts after insert on public.posts
      for each row execute function public.award_fan_points();
  end if;
  if to_regclass('public.post_comments') is not null then
    drop trigger if exists trg_fan_points_pcomments on public.post_comments;
    create trigger trg_fan_points_pcomments after insert on public.post_comments
      for each row execute function public.award_fan_points();
  end if;
  if to_regclass('public.comments') is not null then
    drop trigger if exists trg_fan_points_comments on public.comments;
    create trigger trg_fan_points_comments after insert on public.comments
      for each row execute function public.award_fan_points();
  end if;
  if to_regclass('public.event_interests') is not null then
    drop trigger if exists trg_fan_points_interests on public.event_interests;
    create trigger trg_fan_points_interests after insert on public.event_interests
      for each row execute function public.award_fan_points();
  end if;
end $$;

-- 5. Recalcule les points de l'existant (seulement depuis les tables présentes)
do $$
begin
  update public.profiles set fan_points = 0;
  if to_regclass('public.posts') is not null then
    update public.profiles p set fan_points = fan_points
      + 3*coalesce((select count(*) from public.posts x where x.user_id=p.id),0);
  end if;
  if to_regclass('public.post_comments') is not null then
    update public.profiles p set fan_points = fan_points
      + coalesce((select count(*) from public.post_comments x where x.user_id=p.id),0);
  end if;
  if to_regclass('public.comments') is not null then
    update public.profiles p set fan_points = fan_points
      + coalesce((select count(*) from public.comments x where x.user_id=p.id),0);
  end if;
  if to_regclass('public.event_interests') is not null then
    update public.profiles p set fan_points = fan_points
      + coalesce((select count(*) from public.event_interests x where x.user_id=p.id),0);
  end if;
end $$;

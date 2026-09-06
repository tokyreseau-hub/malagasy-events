-- ════════════════════════════════════════════════════════════════
-- DURCISSEMENT SÉCURITÉ — Malagasy Events  (version robuste)
-- À exécuter dans Supabase → SQL Editor → Run.
-- Sans risque : ne supprime aucune donnée. N'applique les règles qu'aux
-- tables qui existent réellement (les absentes sont ignorées proprement).
-- Idempotent : relançable autant de fois que voulu.
-- ════════════════════════════════════════════════════════════════

do $$
declare
  has_admin boolean := (to_regclass('public.profiles') is not null);
begin

  -- ── PROFILS ───────────────────────────────────────────
  if to_regclass('public.profiles') is not null then
    alter table public.profiles enable row level security;
    drop policy if exists "profils lecture publique" on public.profiles;
    create policy "profils lecture publique" on public.profiles for select using (true);
    drop policy if exists "modifier son profil" on public.profiles;
    create policy "modifier son profil" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);
    drop policy if exists "creer son profil" on public.profiles;
    create policy "creer son profil" on public.profiles for insert with check (auth.uid()=id);
  end if;

  -- ── MESSAGES PRIVÉS (critique) ────────────────────────
  if to_regclass('public.messages') is not null then
    alter table public.messages enable row level security;
    drop policy if exists "lire ses messages" on public.messages;
    create policy "lire ses messages" on public.messages for select
      using (auth.uid()=sender_id or auth.uid()=recipient_id);
    drop policy if exists "envoyer un message" on public.messages;
    create policy "envoyer un message" on public.messages for insert with check (auth.uid()=sender_id);
    drop policy if exists "marquer lu" on public.messages;
    create policy "marquer lu" on public.messages for update using (auth.uid()=recipient_id) with check (auth.uid()=recipient_id);
  end if;

  -- ── RAPPELS EMAIL (si la table existe un jour) ────────
  if to_regclass('public.email_reminders') is not null then
    alter table public.email_reminders enable row level security;
    drop policy if exists "voir ses rappels" on public.email_reminders;
    create policy "voir ses rappels" on public.email_reminders for select using (auth.uid()=user_id or public.is_admin());
    drop policy if exists "gerer ses rappels" on public.email_reminders;
    create policy "gerer ses rappels" on public.email_reminders for insert with check (auth.uid()=user_id);
    drop policy if exists "supprimer ses rappels" on public.email_reminders;
    create policy "supprimer ses rappels" on public.email_reminders for delete using (auth.uid()=user_id or public.is_admin());
  end if;

  -- ── POSTS ─────────────────────────────────────────────
  if to_regclass('public.posts') is not null then
    alter table public.posts enable row level security;
    drop policy if exists "posts lecture publique" on public.posts;
    create policy "posts lecture publique" on public.posts for select using (true);
    drop policy if exists "publier un post" on public.posts;
    create policy "publier un post" on public.posts for insert with check (auth.uid()=user_id);
    drop policy if exists "modifier son post" on public.posts;
    create policy "modifier son post" on public.posts for update using (auth.uid()=user_id);
    drop policy if exists "supprimer son post ou admin" on public.posts;
    create policy "supprimer son post ou admin" on public.posts for delete using (auth.uid()=user_id or public.is_admin());
  end if;

  -- ── COMMENTAIRES DE POSTS ─────────────────────────────
  if to_regclass('public.post_comments') is not null then
    alter table public.post_comments enable row level security;
    drop policy if exists "comm lecture publique" on public.post_comments;
    create policy "comm lecture publique" on public.post_comments for select using (true);
    drop policy if exists "commenter" on public.post_comments;
    create policy "commenter" on public.post_comments for insert with check (auth.uid()=user_id);
    drop policy if exists "supprimer son comm ou admin" on public.post_comments;
    create policy "supprimer son comm ou admin" on public.post_comments for delete using (auth.uid()=user_id or public.is_admin());
  end if;

  -- ── COMMENTAIRES D'ÉVÉNEMENTS ─────────────────────────
  if to_regclass('public.comments') is not null then
    alter table public.comments enable row level security;
    drop policy if exists "ev comm lecture publique" on public.comments;
    create policy "ev comm lecture publique" on public.comments for select using (true);
    drop policy if exists "ev commenter" on public.comments;
    create policy "ev commenter" on public.comments for insert with check (auth.uid()=user_id);
    drop policy if exists "ev supprimer son comm ou admin" on public.comments;
    create policy "ev supprimer son comm ou admin" on public.comments for delete using (auth.uid()=user_id or public.is_admin());
  end if;

  -- ── LIKES ─────────────────────────────────────────────
  if to_regclass('public.post_likes') is not null then
    alter table public.post_likes enable row level security;
    drop policy if exists "likes lecture publique" on public.post_likes;
    create policy "likes lecture publique" on public.post_likes for select using (true);
    drop policy if exists "liker" on public.post_likes;
    create policy "liker" on public.post_likes for insert with check (auth.uid()=user_id);
    drop policy if exists "retirer son like" on public.post_likes;
    create policy "retirer son like" on public.post_likes for delete using (auth.uid()=user_id);
  end if;

  -- ── ABONNEMENTS ───────────────────────────────────────
  if to_regclass('public.follows') is not null then
    alter table public.follows enable row level security;
    drop policy if exists "follows lecture publique" on public.follows;
    create policy "follows lecture publique" on public.follows for select using (true);
    drop policy if exists "suivre" on public.follows;
    create policy "suivre" on public.follows for insert with check (auth.uid()=follower_id);
    drop policy if exists "ne plus suivre" on public.follows;
    create policy "ne plus suivre" on public.follows for delete using (auth.uid()=follower_id);
  end if;

  -- ── FAVORIS ───────────────────────────────────────────
  if to_regclass('public.favorites') is not null then
    alter table public.favorites enable row level security;
    drop policy if exists "voir ses favoris" on public.favorites;
    create policy "voir ses favoris" on public.favorites for select using (auth.uid()=user_id);
    drop policy if exists "ajouter un favori" on public.favorites;
    create policy "ajouter un favori" on public.favorites for insert with check (auth.uid()=user_id);
    drop policy if exists "retirer un favori" on public.favorites;
    create policy "retirer un favori" on public.favorites for delete using (auth.uid()=user_id);
  end if;

  -- ── INTÉRÊTS D'ÉVÉNEMENT (Qui y va) ───────────────────
  if to_regclass('public.event_interests') is not null then
    alter table public.event_interests enable row level security;
    drop policy if exists "interets lecture publique" on public.event_interests;
    create policy "interets lecture publique" on public.event_interests for select using (true);
    drop policy if exists "marquer interet" on public.event_interests;
    create policy "marquer interet" on public.event_interests for insert with check (auth.uid()=user_id);
    drop policy if exists "retirer interet" on public.event_interests;
    create policy "retirer interet" on public.event_interests for delete using (auth.uid()=user_id);
  end if;

end $$;

-- ── Anti-usurpation : personne ne peut se renommer admin ni s'offrir le statut membre ──
-- (trigger séparé, seulement si la table profiles existe)
do $$
begin
  if to_regclass('public.profiles') is not null then
    create or replace function public.protect_profile_fields() returns trigger
    language plpgsql security definer as $f$
    begin
      if not public.is_admin() then
        if new.username is distinct from old.username and old.username is not null then
          new.username := old.username;
        end if;
        if to_jsonb(new) ? 'is_member' then
          new.is_member := old.is_member;
        end if;
      end if;
      return new;
    end $f$;
    drop trigger if exists trg_protect_profile on public.profiles;
    create trigger trg_protect_profile before update on public.profiles
      for each row execute function public.protect_profile_fields();
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════
-- VÉRIFICATION FINALE — doit renvoyer AUCUNE ligne.
-- Toute table listée ici est encore SANS protection.
-- ════════════════════════════════════════════════════════════════
select tablename as "table_sans_protection_RLS"
from pg_tables
where schemaname='public' and rowsecurity=false;

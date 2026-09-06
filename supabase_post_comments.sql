-- ════════════════════════════════════════════════════════════════
-- COMMENTAIRES SOUS LES POSTS — Malagasy Events
-- Crée la table manquante « post_comments » (commentaires du fil communauté).
-- À exécuter dans Supabase → SQL Editor → Run. Sans risque, idempotent.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.post_comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.post_comments enable row level security;

drop policy if exists "comm lecture publique" on public.post_comments;
create policy "comm lecture publique" on public.post_comments for select using (true);
drop policy if exists "commenter" on public.post_comments;
create policy "commenter" on public.post_comments for insert with check (auth.uid() = user_id);
drop policy if exists "supprimer son comm ou admin" on public.post_comments;
create policy "supprimer son comm ou admin" on public.post_comments for delete
  using (auth.uid() = user_id or public.is_admin());

-- Points fans pour un commentaire (+1), si le système de badges est installé
do $$
begin
  if exists (select 1 from pg_proc where proname='award_fan_points') then
    drop trigger if exists trg_fan_points_pcomments on public.post_comments;
    create trigger trg_fan_points_pcomments after insert on public.post_comments
      for each row execute function public.award_fan_points();
  end if;
end $$;

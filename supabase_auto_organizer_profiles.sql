-- FICHES ORGANISATEURS AUTOMATIQUES — Malagasy Events
-- À exécuter dans Supabase avant de publier la fonctionnalité.
-- Aucun contact de compte privé n'est copié : seuls les champs explicitement
-- renseignés comme contacts publics dans la proposition d'événement sont gardés.

alter table public.events
  add column if not exists orga_id bigint
  references public.organisateurs(id) on delete set null;

create index if not exists events_orga_id_idx
  on public.events(orga_id);

alter table public.event_submissions
  add column if not exists organizer_site text default '',
  add column if not exists organizer_facebook text default '',
  add column if not exists organizer_instagram text default '',
  add column if not exists organizer_contact text default '';

comment on column public.event_submissions.organizer_contact is
  'E-mail ou téléphone explicitement fourni pour affichage public sur la fiche organisateur.';

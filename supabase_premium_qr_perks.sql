-- ════════════════════════════════════════════════════════════════
-- QR CODES PERSONNELS — AVANTAGES PREMIUM — Malagasy Events
-- À exécuter dans Supabase SQL Editor → New query → Run.
-- Les avantages restent réservés aux profils avec le plan « pro »
-- (nom actuel du pack Membre Premium dans l'application).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.perk_redemptions (
  id uuid primary key default gen_random_uuid(),
  perk_id bigint not null references public.perks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  period_start date not null default date_trunc('month', now())::date,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (perk_id, user_id, period_start)
);
alter table public.perk_redemptions enable row level security;

-- Aucun accès direct à la table : seules les fonctions ci-dessous y accèdent.
create or replace function public.issue_perk_qr(p_perk_id bigint)
returns table(token uuid, expires_at timestamptz)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  existing_id uuid;
  existing_redeemed_at timestamptz;
  month_start date := date_trunc('month', now())::date;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and plan = 'pro') then
    raise exception 'Avantage réservé aux membres Premium';
  end if;
  if not exists (select 1 from public.perks where id = p_perk_id and active) then
    raise exception 'Cet avantage n’est pas disponible';
  end if;

  select id, redeemed_at into existing_id, existing_redeemed_at
  from public.perk_redemptions
  where perk_id = p_perk_id and user_id = auth.uid() and period_start = month_start
  for update;

  if existing_id is not null and existing_redeemed_at is not null then
    raise exception 'Avantage déjà utilisé ce mois-ci';
  elsif existing_id is not null then
    return query
      update public.perk_redemptions
      set token = gen_random_uuid(), issued_at = now(), expires_at = now() + interval '2 minutes'
      where id = existing_id
      returning perk_redemptions.token, perk_redemptions.expires_at;
  else
    return query
      insert into public.perk_redemptions (perk_id,user_id,period_start,expires_at)
      values (p_perk_id,auth.uid(),month_start,now() + interval '2 minutes')
      returning perk_redemptions.token, perk_redemptions.expires_at;
  end if;
end;
$$;

create or replace function public.redeem_perk_qr(p_token uuid)
returns table(valid boolean, message text, partner text, offer text, city text)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  redemption record;
begin
  select r.id,r.expires_at,r.redeemed_at,p.active,p.partner,p.offer,p.city
    into redemption
  from public.perk_redemptions r
  join public.perks p on p.id = r.perk_id
  where r.token = p_token
  for update of r;

  if not found then
    return query select false,'QR code inconnu.',null::text,null::text,null::text;
  elsif redemption.redeemed_at is not null then
    return query select false,'Cet avantage a déjà été utilisé.',null::text,null::text,null::text;
  elsif redemption.expires_at <= now() then
    return query select false,'Ce QR code a expiré. Le membre doit en générer un nouveau.',null::text,null::text,null::text;
  elsif not redemption.active then
    return query select false,'Cet avantage n’est plus actif.',null::text,null::text,null::text;
  end if;

  update public.perk_redemptions set redeemed_at = now() where id = redemption.id;
  return query select true,'Appliquez l’avantage maintenant.',redemption.partner,redemption.offer,redemption.city;
end;
$$;

revoke all on function public.issue_perk_qr(bigint) from public;
grant execute on function public.issue_perk_qr(bigint) to authenticated;
revoke all on function public.redeem_perk_qr(uuid) from public;
grant execute on function public.redeem_perk_qr(uuid) to anon, authenticated;

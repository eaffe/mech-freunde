-- Mech-Freunde v1.2 – Erstes Spiel: Profil und Eltern-E-Mail.
-- Additive Migration, die vorhandene Spieler- und Kampfdatensaetze erhaelt.
-- Eltern-E-Mails werden ausschliesslich ueber Supabase Auth verknuepft,
-- niemals in mf5_profiles oder in der oeffentlichen Bestenliste gespeichert.

alter table public.mf5_profiles
  add column if not exists onboarding_complete boolean not null default false;

-- Bestehende, selbst eingerichtete Profile nicht erneut abfragen.
update public.mf5_profiles
  set onboarding_complete = true
  where onboarding_complete = false and nickname <> 'Mech-Pilot';

create or replace function public.mf5_profile()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); p public.mf5_profiles%rowtype;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  insert into public.mf5_profiles(user_id) values (u) on conflict(user_id) do nothing;
  select * into p from public.mf5_profiles where user_id=u;
  return jsonb_build_object('points',p.points,'wins',p.wins,'losses',p.losses,
    'paints',p.paints,'activePaint',p.active_paint,'nickname',p.nickname,
    'avatar',p.avatar,'showInLeaderboard',p.show_in_leaderboard,
    'onboardingComplete',p.onboarding_complete);
end;
$$;

create or replace function public.mf6_set_identity(p_name text, p_avatar text, p_public boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); cleaned text;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  cleaned:=trim(coalesce(p_name,''));
  if length(cleaned)<3 or length(cleaned)>22
    or cleaned !~ '^[[:alnum:]][[:alnum:] _-]{2,21}$'
    or cleaned ~* '(fuck|shit|arschloch|hurensohn|nazi|hitler|wichser|fotze)' then
    raise exception 'INVALID_NICKNAME';
  end if;
  if p_avatar is null or p_avatar <> all(array['🤖','🐉','🦊','🐼','🐯','🦉','🦄','🚀','⭐','🦁','🐺','🛡️']) then
    raise exception 'INVALID_AVATAR';
  end if;
  perform public.mf5_profile();
  update public.mf5_profiles set
    nickname=cleaned,avatar=p_avatar,show_in_leaderboard=coalesce(p_public,false),
    onboarding_complete=true,updated_at=now()
  where user_id=u;
  return public.mf5_profile();
end;
$$;

-- Enge Execute-Rechte: keine direkten Schreibrechte auf Profil-Tabelle.
revoke all on function public.mf5_profile() from public,anon;
revoke all on function public.mf6_set_identity(text,text,boolean) from public,anon;
grant execute on function public.mf5_profile() to authenticated;
grant execute on function public.mf6_set_identity(text,text,boolean) to authenticated;

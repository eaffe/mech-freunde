-- MECH-FREUNDE v0.5 / einmalig im Supabase SQL Editor ausfuehren.
-- Zusaetzlich in Auth > Providers > Anonymous Sign-ins AKTIVIEREN.
-- Verwendet eigene mf5_*-Namen; vorhandene Mech-Arena-Tabellen bleiben unberuehrt.
-- Browser benutzt ausschliesslich URL + Publishable/Anon Key (nie service_role).

create table if not exists public.mf5_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  paints text[] not null default array[]::text[],
  active_paint text not null default 'none' check (active_paint in ('none','neon','onyx','ember')),
  updated_at timestamptz not null default now()
);

create table if not exists public.mf5_matches (
  id uuid primary key default gen_random_uuid(),
  code varchar(6) not null unique,
  host_id uuid not null references auth.users(id),
  guest_id uuid references auth.users(id),
  status text not null default 'waiting' check (status in ('waiting','active','finished','expired')),
  turn_id uuid,
  host_hp integer not null default 100 check (host_hp between 0 and 100),
  guest_hp integer not null default 100 check (guest_hp between 0 and 100),
  host_power integer not null default 0 check (host_power between 0 and 3),
  guest_power integer not null default 0 check (guest_power between 0 and 3),
  host_guard boolean not null default false,
  guest_guard boolean not null default false,
  host_look jsonb not null default '{}'::jsonb,
  guest_look jsonb not null default '{}'::jsonb,
  winner_id uuid,
  last_event jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  constraint mf5_distinct_players check (guest_id is null or guest_id <> host_id)
);

create index if not exists mf5_host_recent on public.mf5_matches(host_id,created_at desc);
create index if not exists mf5_guest_recent on public.mf5_matches(guest_id,created_at desc);

-- Pro anonymer Identitaet nur acht ungültige Codes in zehn Minuten.
create table if not exists public.mf5_join_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  since_at timestamptz not null default now(),
  failed_count integer not null default 0
);

alter table public.mf5_profiles enable row level security;
alter table public.mf5_matches enable row level security;
alter table public.mf5_join_limits enable row level security;
-- Keine Tabellen-Policies! Nur serverseitig gepruefte SECURITY DEFINER RPCs.
revoke all on public.mf5_profiles, public.mf5_matches, public.mf5_join_limits from public, anon, authenticated;

-- Schmale, auth-basierte Snapshot-Funktion; niemals fremde Raumdaten preisgeben.
create or replace function public.mf5_match_state(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.mf5_matches%rowtype; u uuid := auth.uid();
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into m from public.mf5_matches where id=p_id;
  if not found or (m.host_id <> u and m.guest_id is distinct from u) then
    raise exception 'NOT_FOUND';
  end if;
  if m.status in ('waiting','active') and m.expires_at < now() then
    update public.mf5_matches set status='expired',turn_id=null,updated_at=now(),version=version+1
    where id=m.id and status in ('waiting','active');
    select * into m from public.mf5_matches where id=p_id;
  end if;
  return jsonb_build_object(
    'id',m.id,'code',m.code,'status',m.status,
    'side',case when m.host_id=u then 'host' else 'guest' end,
    'turn',case when m.turn_id=m.host_id then 'host' when m.turn_id=m.guest_id then 'guest' else null end,
    'hostHp',m.host_hp,'guestHp',m.guest_hp,'hostPower',m.host_power,'guestPower',m.guest_power,
    'hostGuard',m.host_guard,'guestGuard',m.guest_guard,
    'hostLook',m.host_look,'guestLook',m.guest_look,
    'winner',case when m.winner_id=m.host_id then 'host' when m.winner_id=m.guest_id then 'guest' else null end,
    'event',m.last_event,'version',m.version,
    'expiresAt',m.expires_at
  );
end;
$$;

create or replace function public.mf5_profile()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); p public.mf5_profiles%rowtype;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  insert into public.mf5_profiles(user_id) values (u) on conflict(user_id) do nothing;
  select * into p from public.mf5_profiles where user_id=u;
  return jsonb_build_object('points',p.points,'wins',p.wins,'losses',p.losses,
    'paints',p.paints,'activePaint',p.active_paint);
end;
$$;

-- Liefert ausschliesslich einen eigenen aktuellen Raum zur Wiederaufnahme.
create or replace function public.mf5_current_match()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); match_id uuid;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select id into match_id from public.mf5_matches
  where (host_id=u or guest_id=u)
    and ((status in ('waiting','active') and expires_at > now())
      or (status='finished' and updated_at > now()-interval '10 minutes'))
  order by case when status in ('waiting','active') then 0 else 1 end, created_at desc limit 1;
  if match_id is null then return null; end if;
  return public.mf5_match_state(match_id);
end;
$$;

-- Client-Bauteile haben nur eine optische Funktion: beide Seiten kaempfen
-- im fairen Duell mit denselben Basiswerten. Premium-Farben sind serverseitig.
create or replace function public.mf5_sanitize_look(p_look jsonb, p_paint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_look is null or jsonb_typeof(p_look) <> 'object' then p_look := '{}'::jsonb; end if;
  return jsonb_build_object(
    'head',case when p_look->>'head'=any(array['smile','visor','antenna','samurai']) then p_look->>'head' else 'smile' end,
    'body',case when p_look->>'body'=any(array['heart','shield','bolt','shoulders']) then p_look->>'body' else 'heart' end,
    'arms',case when p_look->>'arms'=any(array['hands','laser','rockets','blades','champion']) then p_look->>'arms' else 'hands' end,
    'legs',case when p_look->>'legs'=any(array['boots','hover','tracks']) then p_look->>'legs' else 'boots' end,
    'style',case when p_look->>'style'=any(array['light','strong','fast']) then p_look->>'style' else 'light' end,
    'color',case when p_paint in ('neon','onyx','ember') then p_paint
      when p_look->>'color'=any(array['mint','pink','blue','orange','purple','lime','red','gold']) then p_look->>'color'
      else 'mint' end
  );
end;
$$;

create or replace function public.mf5_create_match(p_look jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); code_value text; i integer; n integer; new_id uuid; active_paint text;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtext(u::text));
  perform public.mf5_profile();
  if exists (select 1 from public.mf5_matches
    where (host_id=u or guest_id=u) and status in ('waiting','active') and expires_at>now()) then
    raise exception 'ALREADY_IN_MATCH';
  end if;
  select p.active_paint into active_paint from public.mf5_profiles p where user_id=u;
  for n in 1..10 loop
    code_value := '';
    for i in 1..6 loop
      code_value := code_value || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',floor(random()*32)::int+1,1);
    end loop;
    if not exists(select 1 from public.mf5_matches where code=code_value) then exit; end if;
  end loop;
  if exists(select 1 from public.mf5_matches where code=code_value) then raise exception 'TRY_AGAIN'; end if;
  insert into public.mf5_matches(code,host_id,host_look)
  values (code_value,u,public.mf5_sanitize_look(p_look,active_paint)) returning id into new_id;
  return public.mf5_match_state(new_id);
end;
$$;

create or replace function public.mf5_join_match(p_code text, p_look jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); m public.mf5_matches%rowtype; limit_row public.mf5_join_limits%rowtype;
paint_value text; input_code text;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtext(u::text));
  insert into public.mf5_join_limits(user_id) values(u) on conflict(user_id) do nothing;
  select * into limit_row from public.mf5_join_limits where user_id=u for update;
  if limit_row.since_at < now()-interval '10 minutes' then
    update public.mf5_join_limits set since_at=now(),failed_count=0 where user_id=u;
    limit_row.failed_count := 0;
  end if;
  if limit_row.failed_count >= 8 then return jsonb_build_object('error','TOO_MANY_TRIES'); end if;
  input_code := upper(trim(coalesce(p_code,'')));
  if input_code !~ '^[A-HJ-NP-Z2-9]{6}$' then
    update public.mf5_join_limits set failed_count=failed_count+1 where user_id=u;
    return jsonb_build_object('error','ROOM_NOT_FOUND');
  end if;
  if exists (select 1 from public.mf5_matches where (host_id=u or guest_id=u)
    and status in ('waiting','active') and expires_at>now()) then raise exception 'ALREADY_IN_MATCH'; end if;
  select * into m from public.mf5_matches where code=input_code for update;
  if not found or m.status <> 'waiting' or m.guest_id is not null or m.expires_at <= now() or m.host_id=u then
    update public.mf5_join_limits set failed_count=failed_count+1 where user_id=u;
    return jsonb_build_object('error','ROOM_NOT_FOUND');
  end if;
  perform public.mf5_profile();
  select active_paint into paint_value from public.mf5_profiles where user_id=u;
  update public.mf5_matches set guest_id=u,guest_look=public.mf5_sanitize_look(p_look,paint_value),
    status='active',turn_id=m.host_id,expires_at=now()+interval '1 hour',
    updated_at=now(),version=version+1,last_event=jsonb_build_object('kind','join','by','guest','damage',0)
  where id=m.id;
  return public.mf5_match_state(m.id);
end;
$$;

create or replace function public.mf5_move(p_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); m public.mf5_matches%rowtype;
my_side text; your_side text; dmg integer:=0; hp_after integer; powered integer;
was_guard boolean; hit boolean; finished boolean:=false; next_id uuid;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_action not in ('attack','shield','special') then raise exception 'INVALID_ACTION'; end if;
  select * into m from public.mf5_matches where id=p_id for update;
  if not found or (u<>m.host_id and u is distinct from m.guest_id) then raise exception 'NOT_FOUND'; end if;
  if m.status<>'active' or m.expires_at<=now() or m.turn_id is distinct from u then raise exception 'NOT_YOUR_TURN'; end if;
  my_side := case when u=m.host_id then 'host' else 'guest' end;
  your_side := case when my_side='host' then 'guest' else 'host' end;
  powered := case when my_side='host' then m.host_power else m.guest_power end;
  if p_action='special' and powered<3 then raise exception 'NOT_READY'; end if;
  if p_action='shield' then
    if my_side='host' then m.host_guard:=true; else m.guest_guard:=true; end if;
  else
    hit := random()>=0.12;
    dmg := case when not hit then 0 when p_action='special' then 25+floor(random()*10)::int
        else 12+floor(random()*9)::int end;
    was_guard := case when your_side='host' then m.host_guard else m.guest_guard end;
    if was_guard then dmg:=greatest(0,dmg-10); end if;
    if your_side='host' then
      m.host_hp:=greatest(0,m.host_hp-dmg); m.host_guard:=false; hp_after:=m.host_hp;
    else
      m.guest_hp:=greatest(0,m.guest_hp-dmg); m.guest_guard:=false; hp_after:=m.guest_hp;
    end if;
    finished:=hp_after=0;
  end if;
  if my_side='host' then m.host_power:=case when p_action='special' then 0 else least(3,powered+1) end;
  else m.guest_power:=case when p_action='special' then 0 else least(3,powered+1) end; end if;
  next_id := case when my_side='host' then m.guest_id else m.host_id end;
  update public.mf5_matches set
    host_hp=m.host_hp,guest_hp=m.guest_hp,host_guard=m.host_guard,guest_guard=m.guest_guard,
    host_power=m.host_power,guest_power=m.guest_power,
    turn_id=case when finished then null else next_id end,
    status=case when finished then 'finished' else 'active' end,
    winner_id=case when finished then u else null end,
    updated_at=now(),version=version+1,
    last_event=jsonb_build_object('kind',case when p_action='shield' then 'guard' when dmg=0 then 'miss' when p_action='special' then 'special' else 'hit' end,'by',my_side,'damage',dmg)
  where id=p_id;
  if finished then
    -- Transaktional: pro Raum nur genau ein Sieg und einmal +10 Punkte.
    update public.mf5_profiles set wins=wins+1,points=points+10,updated_at=now() where user_id=u;
    update public.mf5_profiles set losses=losses+1,updated_at=now() where user_id=next_id;
  end if;
  return public.mf5_match_state(p_id);
end;
$$;

create or replace function public.mf5_cancel_match(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); m public.mf5_matches%rowtype;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into m from public.mf5_matches where id=p_id for update;
  if not found or m.host_id<>u or m.status<>'waiting' then raise exception 'NOT_ALLOWED'; end if;
  update public.mf5_matches set status='expired',updated_at=now(),version=version+1 where id=p_id;
  return public.mf5_match_state(p_id);
end;
$$;

create or replace function public.mf5_buy_paint(p_paint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); cost integer; p public.mf5_profiles%rowtype;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  cost:=case p_paint when 'neon' then 20 when 'onyx' then 30 when 'ember' then 40 else null end;
  if cost is null then raise exception 'INVALID_ITEM'; end if;
  perform public.mf5_profile();
  select * into p from public.mf5_profiles where user_id=u for update;
  if p_paint=any(p.paints) then raise exception 'ALREADY_OWNED'; end if;
  if p.points<cost then raise exception 'NOT_ENOUGH_POINTS'; end if;
  update public.mf5_profiles set points=points-cost,paints=array_append(paints,p_paint),active_paint=p_paint,updated_at=now() where user_id=u;
  return public.mf5_profile();
end;
$$;

create or replace function public.mf5_equip_paint(p_paint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); p public.mf5_profiles%rowtype;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  perform public.mf5_profile();
  select * into p from public.mf5_profiles where user_id=u for update;
  if p_paint<>'none' and not p_paint=any(p.paints) then raise exception 'NOT_OWNED'; end if;
  update public.mf5_profiles set active_paint=p_paint,updated_at=now() where user_id=u;
  return public.mf5_profile();
end;
$$;

-- Nur diese sieben Endpunkte koennen von Spielclients ausgefuehrt werden.
revoke all on function public.mf5_profile() from public, anon;
revoke all on function public.mf5_match_state(uuid) from public, anon;
revoke all on function public.mf5_current_match() from public, anon;
revoke all on function public.mf5_sanitize_look(jsonb,text) from public, anon, authenticated;
revoke all on function public.mf5_create_match(jsonb) from public, anon;
revoke all on function public.mf5_join_match(text,jsonb) from public, anon;
revoke all on function public.mf5_move(uuid,text) from public, anon;
revoke all on function public.mf5_cancel_match(uuid) from public, anon;
revoke all on function public.mf5_buy_paint(text) from public, anon;
revoke all on function public.mf5_equip_paint(text) from public, anon;

grant execute on function public.mf5_profile() to authenticated;
grant execute on function public.mf5_match_state(uuid) to authenticated;
grant execute on function public.mf5_current_match() to authenticated;
grant execute on function public.mf5_create_match(jsonb) to authenticated;
grant execute on function public.mf5_join_match(text,jsonb) to authenticated;
grant execute on function public.mf5_move(uuid,text) to authenticated;
grant execute on function public.mf5_cancel_match(uuid) to authenticated;
grant execute on function public.mf5_buy_paint(text) to authenticated;
grant execute on function public.mf5_equip_paint(text) to authenticated;

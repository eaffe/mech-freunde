-- Mech-Freunde v1.0: private accounts, names, cloud garage, friends, 4-player tournaments.
-- Additive. Existing mf5_* profiles, points, matches and authentication IDs stay intact.

alter table public.mf5_profiles add column if not exists friend_code text;
alter table public.mf5_profiles add column if not exists game_save jsonb;
alter table public.mf5_profiles add column if not exists game_saved_at timestamptz;
update public.mf5_profiles set friend_code=upper(substr(md5(gen_random_uuid()::text),1,8)) where friend_code is null;
create unique index if not exists mf10_unique_friend_code on public.mf5_profiles(friend_code);

-- Nicknames are free-choice, not a fixed word list; only consented players appear publicly.
-- Do not allow arbitrary markup / URLs / long names, or commonly abusive terms.
create or replace function public.mf6_set_identity(p_name text, p_avatar text, p_public boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); cleaned text;
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
  update public.mf5_profiles set nickname=cleaned,avatar=p_avatar,
    show_in_leaderboard=coalesce(p_public,false),updated_at=now() where user_id=u;
  return public.mf5_profile();
end;
$$;

-- Same account can load its offline content on another device. No online points in JSON.
create or replace function public.mf10_game()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  perform public.mf5_profile();
  select jsonb_build_object('game',game_save,'savedAt',game_saved_at) into result
    from public.mf5_profiles where user_id=u;
  return result;
end;
$$;
create or replace function public.mf10_save_game(p_data jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_data is null or jsonb_typeof(p_data)<>'object' or pg_column_size(p_data)>30000 then
    raise exception 'INVALID_GAME_SAVE';
  end if;
  perform public.mf5_profile();
  update public.mf5_profiles set game_save=p_data,game_saved_at=now() where user_id=u;
  return true;
end;
$$;

-- Friends need a random code; never search arbitrary users or disclose emails.
create table if not exists public.mf10_friends (
  sender uuid not null references auth.users(id) on delete cascade,
  receiver uuid not null references auth.users(id) on delete cascade,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (sender,receiver),
  constraint mf10_not_self check (sender<>receiver)
);
alter table public.mf10_friends enable row level security;
revoke all on public.mf10_friends from public,anon,authenticated;

create or replace function public.mf10_friend_code()
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); result text;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  perform public.mf5_profile();
  update public.mf5_profiles set friend_code=upper(substr(md5(gen_random_uuid()::text),1,8))
    where user_id=u and friend_code is null;
  select friend_code into result from public.mf5_profiles where user_id=u;
  return result;
end;
$$;

create or replace function public.mf10_add_friend(p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); target uuid; attempts public.mf5_join_limits%rowtype;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  insert into public.mf5_join_limits(user_id) values(u) on conflict(user_id) do nothing;
  select * into attempts from public.mf5_join_limits where user_id=u for update;
  if attempts.since_at<now()-interval '10 minutes' then
    update public.mf5_join_limits set since_at=now(),failed_count=0 where user_id=u;
    attempts.failed_count:=0;
  end if;
  if attempts.failed_count>=8 then raise exception 'TRY_LATER'; end if;
  if trim(coalesce(p_code,'')) !~* '^[A-F0-9]{8}$' then raise exception 'INVALID_FRIEND_CODE'; end if;
  select user_id into target from public.mf5_profiles where friend_code=upper(trim(p_code));
  if target is null or target=u then
    update public.mf5_join_limits set failed_count=failed_count+1 where user_id=u;
    raise exception 'FRIEND_NOT_FOUND';
  end if;
  if (select count(*) from public.mf10_friends where sender=u or receiver=u)>=50 then raise exception 'TOO_MANY_FRIENDS'; end if;
  if exists(select 1 from public.mf10_friends where sender=target and receiver=u) then
    update public.mf10_friends set accepted=true where sender=target and receiver=u;
  else
    insert into public.mf10_friends(sender,receiver) values(u,target)
      on conflict(sender,receiver) do nothing;
  end if;
  return true;
end;
$$;

create or replace function public.mf10_accept_friend(p_sender uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  update public.mf10_friends set accepted=true where sender=p_sender and receiver=u;
  if not found then raise exception 'FRIEND_REQUEST_NOT_FOUND'; end if;
  return true;
end;
$$;
create or replace function public.mf10_remove_friend(p_other uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  delete from public.mf10_friends
    where (sender=u and receiver=p_other) or (receiver=u and sender=p_other);
  return true;
end;
$$;
create or replace function public.mf10_list_friends()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',f.other_id,'nickname',p.nickname,
    'avatar',p.avatar,'accepted',f.accepted,'incoming',f.incoming) order by f.accepted desc,p.nickname),'[]'::jsonb)
    into result from (
      select case when sender=u then receiver else sender end as other_id,
        accepted,receiver=u as incoming
      from public.mf10_friends where sender=u or receiver=u
    ) f join public.mf5_profiles p on p.user_id=f.other_id;
  return result;
end;
$$;

-- Private four-player knock-out brackets. Only participants can read a bracket.
create table if not exists public.mf10_tournaments (
  id uuid primary key default gen_random_uuid(),
  code varchar(6) not null unique,
  host_id uuid not null references auth.users(id),
  status text not null default 'waiting' check(status in ('waiting','active','finished')),
  semi1 uuid references public.mf5_matches(id),
  semi2 uuid references public.mf5_matches(id),
  final_match uuid references public.mf5_matches(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '2 days')
);
create table if not exists public.mf10_tournament_players (
  tournament_id uuid not null references public.mf10_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check(slot between 1 and 4),
  look jsonb not null default '{}'::jsonb,
  primary key(tournament_id,user_id),
  unique(tournament_id,slot)
);
alter table public.mf10_tournaments enable row level security;
alter table public.mf10_tournament_players enable row level security;
revoke all on public.mf10_tournaments,public.mf10_tournament_players from public,anon,authenticated;

create or replace function public.mf10_tourney_state(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); t public.mf10_tournaments%rowtype;
  s1 public.mf5_matches%rowtype; s2 public.mf5_matches%rowtype; fin public.mf5_matches%rowtype;
  player_data jsonb; bracket_data jsonb; my_match uuid;
  name1 text;name2 text;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into t from public.mf10_tournaments where code=upper(trim(p_code)) for update;
  if not found or not exists(select 1 from public.mf10_tournament_players where tournament_id=t.id and user_id=u) then
    raise exception 'TOURNAMENT_NOT_FOUND';
  end if;
  if t.semi1 is not null then select * into s1 from public.mf5_matches where id=t.semi1; end if;
  if t.semi2 is not null then select * into s2 from public.mf5_matches where id=t.semi2; end if;
  if t.final_match is null and s1.status='finished' and s2.status='finished' then
    insert into public.mf5_matches(code,host_id,guest_id,status,turn_id,host_look,guest_look,expires_at,
      last_event)
      values ((select array_to_string(array(select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',floor(random()*32)::int+1,1) from generate_series(1,6)),'')),
        s1.winner_id,s2.winner_id,'active',s1.winner_id,
        case when s1.winner_id=s1.host_id then s1.host_look else s1.guest_look end,
        case when s2.winner_id=s2.host_id then s2.host_look else s2.guest_look end,
        now()+interval '1 hour',jsonb_build_object('kind','join','by','host','damage',0))
      returning id into t.final_match;
    update public.mf10_tournaments set final_match=t.final_match where id=t.id;
  end if;
  if t.final_match is not null then
    select * into fin from public.mf5_matches where id=t.final_match;
    if fin.status='finished' and t.status<>'finished' then
      update public.mf10_tournaments set status='finished' where id=t.id;
      t.status:='finished';
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('slot',q.slot,'name',p.nickname,'avatar',p.avatar) order by q.slot),'[]'::jsonb)
    into player_data from public.mf10_tournament_players q join public.mf5_profiles p on p.user_id=q.user_id
    where q.tournament_id=t.id;
  select coalesce(jsonb_agg(jsonb_build_object('label',m.label,'id',m.match_id,
    'status',b.status,'host',h.nickname,'guest',g.nickname,'winner',w.nickname) order by m.ord),'[]'::jsonb)
    into bracket_data
    from (values (1,'Halbfinale 1',t.semi1),(2,'Halbfinale 2',t.semi2),(3,'Finale',t.final_match)) m(ord,label,match_id)
    left join public.mf5_matches b on b.id=m.match_id
    left join public.mf5_profiles h on h.user_id=b.host_id
    left join public.mf5_profiles g on g.user_id=b.guest_id
    left join public.mf5_profiles w on w.user_id=b.winner_id;
  select m.id into my_match from public.mf5_matches m where m.id in (t.semi1,t.semi2,t.final_match)
    and (m.host_id=u or m.guest_id=u) and m.status='active' order by m.created_at desc limit 1;
  return jsonb_build_object('code',t.code,'status',t.status,'players',player_data,
    'bracket',bracket_data,'myMatchId',my_match);
end;
$$;

create or replace function public.mf10_tourney_create(p_look jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid();t_id uuid;code_value text; i integer;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  perform public.mf5_profile();
  if exists(select 1 from public.mf5_matches where (host_id=u or guest_id=u)
     and status in ('active','waiting') and expires_at>now()) then raise exception 'ALREADY_IN_MATCH'; end if;
  for i in 1..15 loop
    select array_to_string(array(select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',floor(random()*32)::int+1,1) from generate_series(1,6)),'') into code_value;
    exit when not exists(select 1 from public.mf10_tournaments where code=code_value);
  end loop;
  insert into public.mf10_tournaments(code,host_id) values(code_value,u) returning id into t_id;
  insert into public.mf10_tournament_players(tournament_id,user_id,slot,look)
    values(t_id,u,1,public.mf5_sanitize_look(p_look,'none'));
  return public.mf10_tourney_state(code_value);
end;
$$;

create or replace function public.mf10_tourney_join(p_code text,p_look jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid();t public.mf10_tournaments%rowtype;n int;
  a public.mf10_tournament_players%rowtype;b public.mf10_tournament_players%rowtype;
  paint_value text;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  if coalesce(p_code,'') !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'INVALID_TOURNAMENT_CODE'; end if;
  select * into t from public.mf10_tournaments where code=upper(trim(p_code)) for update;
  if not found or t.expires_at<now() then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  if exists(select 1 from public.mf10_tournament_players where tournament_id=t.id and user_id=u) then
    return public.mf10_tourney_state(t.code);
  end if;
  if t.status<>'waiting' then raise exception 'TOURNAMENT_FULL'; end if;
  if exists(select 1 from public.mf5_matches where (host_id=u or guest_id=u)
     and status in ('active','waiting') and expires_at>now()) then raise exception 'ALREADY_IN_MATCH'; end if;
  select count(*) into n from public.mf10_tournament_players where tournament_id=t.id;
  if n>=4 then raise exception 'TOURNAMENT_FULL'; end if;
  perform public.mf5_profile();
  select active_paint into paint_value from public.mf5_profiles where user_id=u;
  insert into public.mf10_tournament_players(tournament_id,user_id,slot,look)
    values(t.id,u,n+1,public.mf5_sanitize_look(p_look,paint_value));
  if n=3 then
    select * into a from public.mf10_tournament_players where tournament_id=t.id and slot=1;
    select * into b from public.mf10_tournament_players where tournament_id=t.id and slot=2;
    insert into public.mf5_matches(code,host_id,guest_id,status,turn_id,host_look,guest_look,expires_at,last_event)
      values ((select array_to_string(array(select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',floor(random()*32)::int+1,1) from generate_series(1,6)),'')),
       a.user_id,b.user_id,'active',a.user_id,a.look,b.look,now()+interval '1 hour',
       jsonb_build_object('kind','join','by','host','damage',0)) returning id into t.semi1;
    select * into a from public.mf10_tournament_players where tournament_id=t.id and slot=3;
    select * into b from public.mf10_tournament_players where tournament_id=t.id and slot=4;
    insert into public.mf5_matches(code,host_id,guest_id,status,turn_id,host_look,guest_look,expires_at,last_event)
      values ((select array_to_string(array(select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',floor(random()*32)::int+1,1) from generate_series(1,6)),'')),
       a.user_id,b.user_id,'active',a.user_id,a.look,b.look,now()+interval '1 hour',
       jsonb_build_object('kind','join','by','host','damage',0)) returning id into t.semi2;
    update public.mf10_tournaments set semi1=t.semi1,semi2=t.semi2,status='active' where id=t.id;
  end if;
  return public.mf10_tourney_state(t.code);
end;
$$;

-- Privileged endpoints: only authenticated clients; tables remain private under RLS.
revoke all on function public.mf10_game(),public.mf10_save_game(jsonb),public.mf10_friend_code(),
 public.mf10_add_friend(text),public.mf10_accept_friend(uuid),public.mf10_remove_friend(uuid),
 public.mf10_list_friends(),public.mf10_tourney_state(text),
 public.mf10_tourney_create(jsonb),public.mf10_tourney_join(text,jsonb) from public,anon;
grant execute on function public.mf10_game(),public.mf10_save_game(jsonb),public.mf10_friend_code(),
 public.mf10_add_friend(text),public.mf10_accept_friend(uuid),public.mf10_remove_friend(uuid),
 public.mf10_list_friends(),public.mf10_tourney_state(text),
 public.mf10_tourney_create(jsonb),public.mf10_tourney_join(text,jsonb) to authenticated;

-- Direct one-tap invites to accepted friends, without retyping room codes.
create table if not exists public.mf10_duel_invites (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references auth.users(id) on delete cascade,
  receiver uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.mf5_matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(sender,receiver,match_id),
  constraint mf10_invite_not_self check (sender<>receiver)
);
create index if not exists mf10_invite_receiver on public.mf10_duel_invites(receiver,created_at desc);
alter table public.mf10_duel_invites enable row level security;
revoke all on public.mf10_duel_invites from public,anon,authenticated;

create or replace function public.mf10_invite_friend(p_receiver uuid,p_match uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid();m public.mf5_matches%rowtype;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  if not exists(select 1 from public.mf10_friends where accepted=true and
    ((sender=u and receiver=p_receiver) or (sender=p_receiver and receiver=u))) then
    raise exception 'NOT_FRIENDS';
  end if;
  select * into m from public.mf5_matches where id=p_match;
  if not found or m.host_id<>u or m.status<>'waiting' or m.guest_id is not null or m.expires_at<=now() then
    raise exception 'NOT_YOUR_ROOM';
  end if;
  insert into public.mf10_duel_invites(sender,receiver,match_id) values(u,p_receiver,p_match)
    on conflict(sender,receiver,match_id) do nothing;
  return true;
end;
$$;

create or replace function public.mf10_pending_invites()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'name',p.nickname,'avatar',p.avatar)
    order by i.created_at desc),'[]'::jsonb) into result
  from public.mf10_duel_invites i join public.mf5_profiles p on p.user_id=i.sender
  join public.mf5_matches m on m.id=i.match_id
  where i.receiver=u and i.created_at>now()-interval '15 minutes'
    and m.status='waiting' and m.guest_id is null and m.expires_at>now();
  return result;
end;
$$;
create or replace function public.mf10_accept_invite(p_invite uuid,p_look jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid();i public.mf10_duel_invites%rowtype;
  match_code text;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into i from public.mf10_duel_invites where id=p_invite and receiver=u;
  if not found or i.created_at<now()-interval '15 minutes' then raise exception 'INVITE_EXPIRED'; end if;
  select code into match_code from public.mf5_matches where id=i.match_id and status='waiting' and expires_at>now();
  if not found then raise exception 'ROOM_CLOSED'; end if;
  return public.mf5_join_match(match_code,p_look);
end;
$$;
revoke all on function public.mf10_invite_friend(uuid,uuid),public.mf10_pending_invites(),
 public.mf10_accept_invite(uuid,jsonb) from public,anon;
grant execute on function public.mf10_invite_friend(uuid,uuid),public.mf10_pending_invites(),
 public.mf10_accept_invite(uuid,jsonb) to authenticated;

-- Own private match history for simple stats; never exposes raw player IDs.
create or replace function public.mf10_match_history()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid();result jsonb;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('time',m.updated_at,'won',m.winner_id=u,
    'opponent',coalesce(p.nickname,'Mech-Pilot'),'avatar',coalesce(p.avatar,'🤖'),
    'forfeit',m.last_event->>'kind'='forfeit') order by m.updated_at desc),'[]'::jsonb)
    into result from (
      select * from public.mf5_matches
      where (host_id=u or guest_id=u) and status='finished'
      order by updated_at desc limit 25
    ) m left join public.mf5_profiles p on p.user_id=case when m.host_id=u then m.guest_id else m.host_id end;
  return result;
end;
$$;
revoke all on function public.mf10_match_history() from public,anon;
grant execute on function public.mf10_match_history() to authenticated;

-- Server cosmetics now accept split left/right arms while preserving old single-arm clients.
create or replace function public.mf5_sanitize_look(p_look jsonb, p_paint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare arms_allowed text[] := array['hands','laser','rockets','blades','champion','hammer','claws','cannons','staff','saw'];
begin
  if p_look is null or jsonb_typeof(p_look)<>'object' then p_look:='{}'::jsonb; end if;
  return jsonb_build_object(
    'head',case when p_look->>'head'=any(array['smile','visor','antenna','samurai','dragon','crystal','owl','knight','star']) then p_look->>'head' else 'smile' end,
    'body',case when p_look->>'body'=any(array['heart','shield','bolt','shoulders','fortress','crystalcore','dragonplate','stealth']) then p_look->>'body' else 'heart' end,
    'arms',case when p_look->>'arms'=any(arms_allowed) then p_look->>'arms' else 'hands' end,
    'leftArm',case when p_look->>'leftArm'=any(arms_allowed) then p_look->>'leftArm'
      when p_look->>'arms'=any(arms_allowed) then p_look->>'arms' else 'hands' end,
    'rightArm',case when p_look->>'rightArm'=any(arms_allowed) then p_look->>'rightArm'
      when p_look->>'arms'=any(arms_allowed) then p_look->>'arms' else 'hands' end,
    'legs',case when p_look->>'legs'=any(array['boots','hover','tracks','spider','titan','skates']) then p_look->>'legs' else 'boots' end,
    'gear',case when p_look->>'gear'=any(array['none','jetpack','wings','shieldpack','powercore','spikes','banner']) then p_look->>'gear' else 'none' end,
    'style',case when p_look->>'style'=any(array['light','strong','fast']) then p_look->>'style' else 'light' end,
    'color',case when p_paint in ('neon','onyx','ember') then p_paint
       when p_look->>'color'=any(array['mint','pink','blue','orange','purple','lime','red','gold']) then p_look->>'color' else 'mint' end
  );
end;
$$;
revoke all on function public.mf5_sanitize_look(jsonb,text) from public,anon,authenticated;

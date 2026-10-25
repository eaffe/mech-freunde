-- Mech-Freunde v0.6: additive migration; existing points, profiles and matches preserved.
-- Run once on the existing "Mech Game for Kids" Supabase project.

alter table public.mf5_profiles
  add column if not exists nickname text not null default 'Mech-Pilot',
  add column if not exists avatar text not null default '🤖',
  add column if not exists show_in_leaderboard boolean not null default false;

alter table public.mf5_matches
  add column if not exists rematch_host boolean not null default false,
  add column if not exists rematch_guest boolean not null default false,
  add column if not exists next_match_id uuid;

-- No direct table access: all new operations are narrow, authenticated RPCs.
revoke all on public.mf5_profiles, public.mf5_matches from public, anon, authenticated;

create or replace function public.mf5_profile()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); p public.mf5_profiles%rowtype;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  insert into public.mf5_profiles(user_id) values (u) on conflict(user_id) do nothing;
  select * into p from public.mf5_profiles where user_id=u;
  return jsonb_build_object('points',p.points,'wins',p.wins,'losses',p.losses,
    'paints',p.paints,'activePaint',p.active_paint,'nickname',p.nickname,
    'avatar',p.avatar,'showInLeaderboard',p.show_in_leaderboard);
end;
$$;

create or replace function public.mf5_match_state(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.mf5_matches%rowtype; u uuid := auth.uid();
  h public.mf5_profiles%rowtype; g public.mf5_profiles%rowtype;
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
  select * into h from public.mf5_profiles where user_id=m.host_id;
  if m.guest_id is not null then
    select * into g from public.mf5_profiles where user_id=m.guest_id;
  end if;
  return jsonb_build_object(
    'id',m.id,'code',m.code,'status',m.status,
    'side',case when m.host_id=u then 'host' else 'guest' end,
    'turn',case when m.turn_id=m.host_id then 'host' when m.turn_id=m.guest_id then 'guest' else null end,
    'hostHp',m.host_hp,'guestHp',m.guest_hp,'hostPower',m.host_power,'guestPower',m.guest_power,
    'hostGuard',m.host_guard,'guestGuard',m.guest_guard,
    'hostLook',m.host_look,'guestLook',m.guest_look,
    'winner',case when m.winner_id=m.host_id then 'host' when m.winner_id=m.guest_id then 'guest' else null end,
    'event',m.last_event,'version',m.version,'expiresAt',m.expires_at,
    'hostName',coalesce(h.nickname,'Mech-Pilot'),'hostAvatar',coalesce(h.avatar,'🤖'),
    'guestName',coalesce(g.nickname,'Mech-Pilot'),'guestAvatar',coalesce(g.avatar,'🤖'),
    'rematchHost',m.rematch_host,'rematchGuest',m.rematch_guest,'nextMatchId',m.next_match_id
  );
end;
$$;


-- Allow newly introduced cosmetic parts in the fair online arena.
create or replace function public.mf5_sanitize_look(p_look jsonb, p_paint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_look is null or jsonb_typeof(p_look) <> 'object' then p_look := '{}'::jsonb; end if;
  return jsonb_build_object(
    'head',case when p_look->>'head'=any(array['smile','visor','antenna','samurai','dragon','crystal','owl','knight','star']) then p_look->>'head' else 'smile' end,
    'body',case when p_look->>'body'=any(array['heart','shield','bolt','shoulders','fortress','crystalcore','dragonplate','stealth']) then p_look->>'body' else 'heart' end,
    'arms',case when p_look->>'arms'=any(array['hands','laser','rockets','blades','champion','hammer','claws','cannons','staff','saw']) then p_look->>'arms' else 'hands' end,
    'legs',case when p_look->>'legs'=any(array['boots','hover','tracks','spider','titan','skates']) then p_look->>'legs' else 'boots' end,
    'gear',case when p_look->>'gear'=any(array['none','jetpack','wings','shieldpack','powercore','spikes','banner']) then p_look->>'gear' else 'none' end,
    'style',case when p_look->>'style'=any(array['light','strong','fast']) then p_look->>'style' else 'light' end,
    'color',case when p_paint in ('neon','onyx','ember') then p_paint
      when p_look->>'color'=any(array['mint','pink','blue','orange','purple','lime','red','gold']) then p_look->>'color'
      else 'mint' end
  );
end;
$$;

-- Safe, selectable nickname components rather than arbitrary user-generated text.
create or replace function public.mf6_set_identity(p_name text, p_avatar text, p_public boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); adj text; animal text;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_name is null or length(p_name)>28 or p_name !~ '^[A-Za-z]+ [A-Za-z]+$' then
    raise exception 'INVALID_NICKNAME';
  end if;
  adj:=split_part(p_name,' ',1); animal:=split_part(p_name,' ',2);
  if adj <> all(array['Blitz','Turbo','Stern','Mega','Neon','Wolken','Feuer','Eis','Super','Gold'])
    or animal <> all(array['Fuchs','Drache','Tiger','Panda','Falke','Robo','Luchs','Komet','Kaefer','Wolf']) then
    raise exception 'INVALID_NICKNAME';
  end if;
  if p_avatar is null or p_avatar <> all(array['🤖','🐉','🦊','🐼','🐯','🦉','🦄','🚀','⭐','🦁','🐺','🛡️']) then
    raise exception 'INVALID_AVATAR';
  end if;
  perform public.mf5_profile();
  update public.mf5_profiles set nickname=p_name,avatar=p_avatar,
    show_in_leaderboard=coalesce(p_public,false),updated_at=now() where user_id=u;
  return public.mf5_profile();
end;
$$;

-- Opt-in leaderboard: no user IDs, no personal data, no hidden profiles.
create or replace function public.mf6_leaderboard()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); result jsonb;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('rank',r.ranking,'nickname',r.nickname,
    'avatar',r.avatar,'wins',r.wins,'points',r.points) order by r.ranking),'[]'::jsonb)
  into result from (
    select row_number() over (order by wins desc,points desc,updated_at asc) as ranking,
      nickname,avatar,wins,points
    from public.mf5_profiles
    where show_in_leaderboard=true and wins>0
    order by wins desc,points desc,updated_at asc limit 20
  ) r;
  return result;
end;
$$;

-- Two-sided rematch invitation. Both players must explicitly accept.
-- The second acceptance creates the new active match atomically; no new code needed.
create or replace function public.mf6_rematch(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); m public.mf5_matches%rowtype;
  next_id uuid; new_code text; i int; n int;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into m from public.mf5_matches where id=p_id for update;
  if not found or (u<>m.host_id and u is distinct from m.guest_id) then raise exception 'NOT_FOUND'; end if;
  if m.next_match_id is not null then return public.mf5_match_state(m.next_match_id); end if;
  if m.status<>'finished' or m.guest_id is null or m.updated_at<now()-interval '30 minutes' then
    raise exception 'REMATCH_UNAVAILABLE';
  end if;
  if exists (select 1 from public.mf5_matches where id<>m.id and
    (host_id in (m.host_id,m.guest_id) or guest_id in (m.host_id,m.guest_id))
    and status in ('waiting','active') and expires_at>now()) then
    raise exception 'ALREADY_IN_MATCH';
  end if;
  if u=m.host_id then m.rematch_host:=true; else m.rematch_guest:=true; end if;
  if m.rematch_host and m.rematch_guest then
    for n in 1..12 loop
      new_code:='';
      for i in 1..6 loop
        new_code:=new_code||substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',floor(random()*32)::int+1,1);
      end loop;
      exit when not exists(select 1 from public.mf5_matches where code=new_code);
    end loop;
    if exists(select 1 from public.mf5_matches where code=new_code) then raise exception 'TRY_AGAIN'; end if;
    insert into public.mf5_matches(code,host_id,guest_id,status,turn_id,host_look,guest_look,expires_at,
      last_event)
    values (new_code,m.host_id,m.guest_id,'active',m.host_id,m.host_look,m.guest_look,
      now()+interval '1 hour',jsonb_build_object('kind','join','by','host','damage',0))
    returning id into next_id;
  end if;
  update public.mf5_matches set rematch_host=m.rematch_host,rematch_guest=m.rematch_guest,
    next_match_id=next_id,version=version+1,updated_at=now() where id=m.id;
  if next_id is not null then return public.mf5_match_state(next_id); end if;
  return public.mf5_match_state(m.id);
end;
$$;

revoke all on function public.mf6_set_identity(text,text,boolean) from public,anon;
revoke all on function public.mf6_leaderboard() from public,anon;
revoke all on function public.mf6_rematch(uuid) from public,anon;
grant execute on function public.mf6_set_identity(text,text,boolean) to authenticated;
grant execute on function public.mf6_leaderboard() to authenticated;
grant execute on function public.mf6_rematch(uuid) to authenticated;

revoke all on function public.mf5_sanitize_look(jsonb,text) from public,anon,authenticated;

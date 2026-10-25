-- v0.8 additive SQL for the existing Mech Game for Kids project.
-- Already applied to production; preserved for fresh deployments.
alter table public.mf5_matches add column if not exists rematch_declined boolean not null default false;
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
    'rematchHost',m.rematch_host,'rematchGuest',m.rematch_guest,
    'rematchDeclined',m.rematch_declined,'nextMatchId',m.next_match_id
  );
end;
$$;
create or replace function public.mf6_rematch(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); m public.mf5_matches%rowtype;
  next_id uuid; new_code text; i int; n int;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into m from public.mf5_matches where id=p_id for update;
  if not found or (u<>m.host_id and u is distinct from m.guest_id) then raise exception 'NOT_FOUND'; end if;
  if m.next_match_id is not null then return public.mf5_match_state(m.next_match_id); end if;
  if m.rematch_declined then raise exception 'REMATCH_DECLINED'; end if;
  if m.status<>'finished' or m.guest_id is null or m.updated_at<now()-interval '30 minutes' then
    raise exception 'REMATCH_UNAVAILABLE';
  end if;
  if exists (select 1 from public.mf5_matches where id<>m.id and
    (host_id in (m.host_id,m.guest_id) or guest_id in (m.host_id,m.guest_id))
    and status in ('waiting','active') and expires_at>now()) then
    raise exception 'ALREADY_IN_MATCH';
  end if;
  if (u=m.host_id and m.rematch_host) or (u=m.guest_id and m.rematch_guest) then
    return public.mf5_match_state(m.id);
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
create or replace function public.mf8_decline_rematch(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); m public.mf5_matches%rowtype;
begin
  if u is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into m from public.mf5_matches where id=p_id for update;
  if not found or (m.host_id<>u and m.guest_id is distinct from u) then raise exception 'NOT_FOUND'; end if;
  if m.status<>'finished' or m.guest_id is null then raise exception 'MATCH_NOT_FINISHED'; end if;
  if m.next_match_id is not null then raise exception 'REMATCH_ALREADY_STARTED'; end if;
  if not m.rematch_declined then
    update public.mf5_matches
      set rematch_declined=true, rematch_host=false, rematch_guest=false, updated_at=now(),version=version+1
      where id=p_id;
  end if;
  return public.mf5_match_state(p_id);
end;
$$;
revoke all on function public.mf8_decline_rematch(uuid) from public,anon;
grant execute on function public.mf8_decline_rematch(uuid) to authenticated;

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  start_date date not null,
  duration_days integer not null default 14 check (duration_days between 1 and 60),
  timezone text not null default 'Asia/Seoul',
  unlock_hour smallint not null default 0 check (unlock_hour between 0 and 23),
  delivery_platform text not null default 'slack',
  language text not null default 'ko',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_participants (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  acquisition_source text not null default 'unknown',
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index if not exists challenge_participants_user_idx
  on public.challenge_participants(user_id, challenge_id);

create table if not exists public.challenge_audios (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 60),
  title text not null default 'TODO',
  body_part text not null default 'TODO',
  description text not null default '',
  storage_path text not null,
  duration_sec integer check (duration_sec is null or duration_sec > 0),
  created_at timestamptz not null default now(),
  unique (challenge_id, day_number),
  unique (id, challenge_id, day_number)
);

create table if not exists public.audio_listens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  audio_id uuid not null,
  challenge_id uuid not null,
  day_number smallint not null,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0 check (open_count >= 0),
  last_position_sec integer not null default 0 check (last_position_sec >= 0),
  max_position_sec integer not null default 0 check (max_position_sec >= 0),
  listened_seconds integer not null default 0 check (listened_seconds >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  listened_local_date date,
  primary key (user_id, audio_id),
  foreign key (audio_id, challenge_id, day_number)
    references public.challenge_audios(id, challenge_id, day_number) on delete cascade
);
create index if not exists audio_listens_challenge_user_idx
  on public.audio_listens(challenge_id, user_id);

create table if not exists public.audio_listen_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  audio_id uuid not null references public.challenge_audios(id) on delete cascade,
  event_type text not null check (event_type in ('play', 'pause', 'seek', 'ended')),
  position_sec integer not null check (position_sec >= 0),
  delta_seconds integer not null default 0 check (delta_seconds >= 0),
  created_at timestamptz not null default now()
);
create index if not exists audio_listen_events_user_created_idx
  on public.audio_listen_events(user_id, created_at desc);
create index if not exists audio_listen_events_audio_created_idx
  on public.audio_listen_events(audio_id, created_at desc);

create table if not exists public.challenge_weekly_checkins (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_number smallint not null check (week_number in (1, 2)),
  method text not null check (method in ('zoom', 'slack')),
  checked_at timestamptz not null default now(),
  primary key (challenge_id, user_id, week_number)
);

alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.challenge_audios enable row level security;
alter table public.audio_listens enable row level security;
alter table public.audio_listen_events enable row level security;
alter table public.challenge_weekly_checkins enable row level security;

drop policy if exists challenge_member_read on public.challenges;
create policy challenge_member_read on public.challenges
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.challenge_participants cp
      where cp.challenge_id = challenges.id and cp.user_id = auth.uid()
    )
  );
drop policy if exists challenge_admin_manage on public.challenges;
create policy challenge_admin_manage on public.challenges
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists challenge_participant_self_read on public.challenge_participants;
create policy challenge_participant_self_read on public.challenge_participants
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists challenge_participant_admin_manage on public.challenge_participants;
create policy challenge_participant_admin_manage on public.challenge_participants
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists challenge_audio_open_read on public.challenge_audios;
drop policy if exists challenge_audio_admin_manage on public.challenge_audios;
create policy challenge_audio_admin_manage on public.challenge_audios
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists audio_listens_owner_read on public.audio_listens;
create policy audio_listens_owner_read on public.audio_listens
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists audio_listen_events_owner_read on public.audio_listen_events;
create policy audio_listen_events_owner_read on public.audio_listen_events
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists challenge_weekly_checkins_admin_manage on public.challenge_weekly_checkins;
create policy challenge_weekly_checkins_admin_manage on public.challenge_weekly_checkins
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.get_challenge_day(p_challenge_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when local_date < start_date then 0
    when local_date >= start_date + duration_days then
      case
        when local_date = start_date + duration_days
             and local_time < make_time(unlock_hour, 0, 0)
          then duration_days
        else duration_days + 1
      end
    when local_time < make_time(unlock_hour, 0, 0)
      then greatest(0, local_date - start_date)
    else local_date - start_date + 1
  end
  from (
    select c.start_date, c.duration_days, c.unlock_hour,
      timezone(c.timezone, statement_timestamp())::date as local_date,
      timezone(c.timezone, statement_timestamp())::time as local_time
    from public.challenges c
    where c.id = p_challenge_id
  ) challenge;
$$;
revoke all on function public.get_challenge_day(uuid) from public, anon;
grant execute on function public.get_challenge_day(uuid) to authenticated;
create policy challenge_audio_open_read on public.challenge_audios
  for select using (
    public.is_admin()
    or (
      day_number <= public.get_challenge_day(challenge_id)
      and exists (
        select 1 from public.challenge_participants cp
        where cp.challenge_id = public.challenge_audios.challenge_id
          and cp.user_id = auth.uid()
      )
    )
  );

insert into storage.buckets (id, name, public, allowed_mime_types)
values (
  'challenge-audio',
  'challenge-audio',
  false,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a']
)
on conflict (id) do update set public = false, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists challenge_audio_storage_open_read on storage.objects;
create policy challenge_audio_storage_open_read on storage.objects
  for select using (
    bucket_id = 'challenge-audio'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.challenge_audios a
        join public.challenge_participants cp on cp.challenge_id = a.challenge_id
        where a.storage_path = storage.objects.name
          and cp.user_id = auth.uid()
          and a.day_number <= public.get_challenge_day(a.challenge_id)
      )
    )
  );
drop policy if exists challenge_audio_storage_admin_manage on storage.objects;
create policy challenge_audio_storage_admin_manage on storage.objects
  for all using (bucket_id = 'challenge-audio' and public.is_admin())
  with check (bucket_id = 'challenge-audio' and public.is_admin());

drop function if exists public.get_my_challenge_audios(uuid);
create function public.get_my_challenge_audios(p_challenge_id uuid)
returns table (
  challenge_id uuid,
  challenge_slug text,
  challenge_title text,
  start_date date,
  duration_days integer,
  timezone text,
  unlock_hour smallint,
  current_day integer,
  server_date date,
  participant_display_name text,
  is_participant boolean,
  viewer_is_admin boolean,
  audio_id uuid,
  day_number smallint,
  audio_title text,
  body_part text,
  description text,
  unlock_date date,
  storage_path text,
  duration_sec integer,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer,
  last_position_sec integer,
  max_position_sec integer,
  listened_seconds integer,
  progress_pct integer,
  completed boolean,
  completed_at timestamptz,
  listened_local_date date
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.slug, c.title, c.start_date, c.duration_days, c.timezone,
    c.unlock_hour, public.get_challenge_day(c.id),
    timezone(c.timezone, statement_timestamp())::date,
    coalesce(cp.display_name, p.nickname), cp.user_id is not null,
    public.is_admin(), a.id, a.day_number, a.title, a.body_part, a.description,
    c.start_date + a.day_number - 1,
    case when a.day_number <= public.get_challenge_day(c.id) or public.is_admin()
      then a.storage_path else null end,
    a.duration_sec, l.first_opened_at, l.last_opened_at,
    coalesce(l.open_count, 0), coalesce(l.last_position_sec, 0),
    coalesce(l.max_position_sec, 0), coalesce(l.listened_seconds, 0),
    case when a.duration_sec > 0
      then least(100, floor(coalesce(l.max_position_sec, 0)::numeric * 100 / a.duration_sec)::integer)
      else null end,
    coalesce(l.completed, false), l.completed_at, l.listened_local_date
  from public.challenges c
  left join public.challenge_participants cp
    on cp.challenge_id = c.id and cp.user_id = auth.uid()
  join public.challenge_audios a on a.challenge_id = c.id
  left join public.audio_listens l
    on l.user_id = auth.uid() and l.audio_id = a.id
  join public.profiles p on p.id = auth.uid()
  where c.id = p_challenge_id and c.is_active
    and (cp.user_id is not null or public.is_admin())
  order by a.day_number;
$$;
revoke all on function public.get_my_challenge_audios(uuid) from public, anon;
grant execute on function public.get_my_challenge_audios(uuid) to authenticated;

create or replace function public.upsert_audio_listen(
  p_audio_id uuid,
  p_event_type text,
  p_position_sec integer,
  p_delta_seconds integer,
  p_request_id uuid default gen_random_uuid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_challenge_id uuid;
  v_day_number smallint;
  v_duration_sec integer;
  v_timezone text;
  v_event_id uuid;
  v_position_sec integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_event_type not in ('play', 'pause', 'seek', 'ended') then
    raise exception 'invalid audio event';
  end if;
  if p_position_sec < 0 or p_delta_seconds < 0 or p_delta_seconds > 86400 then
    raise exception 'invalid audio progress';
  end if;

  select a.challenge_id, a.day_number, a.duration_sec, c.timezone
    into v_challenge_id, v_day_number, v_duration_sec, v_timezone
  from public.challenge_audios a
  join public.challenges c on c.id = a.challenge_id
  where a.id = p_audio_id;
  if not found then
    raise exception 'audio not found';
  end if;
  if not exists (
    select 1 from public.challenge_participants cp
    where cp.challenge_id = v_challenge_id and cp.user_id = v_user_id
  ) then
    raise exception 'challenge participation required';
  end if;
  if v_day_number > public.get_challenge_day(v_challenge_id) then
    raise exception 'audio is locked';
  end if;
  v_position_sec := case when v_duration_sec is null
    then p_position_sec else least(p_position_sec, v_duration_sec) end;

  insert into public.audio_listen_events (
    request_id, user_id, audio_id, event_type, position_sec, delta_seconds
  ) values (
    p_request_id, v_user_id, p_audio_id, p_event_type, v_position_sec, p_delta_seconds
  ) on conflict (request_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return;
  end if;

  insert into public.audio_listens (
    user_id, audio_id, challenge_id, day_number, first_opened_at,
    last_opened_at, open_count, last_position_sec, max_position_sec,
    listened_seconds, completed, completed_at, listened_local_date
  ) values (
    v_user_id, p_audio_id, v_challenge_id, v_day_number,
    case when p_event_type = 'play' then now() else null end,
    case when p_event_type = 'play' then now() else null end,
    case when p_event_type = 'play' then 1 else 0 end,
    v_position_sec, v_position_sec, p_delta_seconds,
    p_event_type = 'ended' and v_duration_sec is not null
      and p_delta_seconds >= ceil(v_duration_sec * 0.8),
    case when p_event_type = 'ended' and v_duration_sec is not null
      and p_delta_seconds >= ceil(v_duration_sec * 0.8) then now() else null end,
    case when p_event_type = 'play' or p_delta_seconds > 0
      then timezone(v_timezone, now())::date else null end
  )
  on conflict (user_id, audio_id) do update set
    first_opened_at = coalesce(audio_listens.first_opened_at, excluded.first_opened_at),
    last_opened_at = case when p_event_type = 'play'
      then now() else audio_listens.last_opened_at end,
    open_count = audio_listens.open_count + case when p_event_type = 'play' then 1 else 0 end,
    last_position_sec = excluded.last_position_sec,
    max_position_sec = greatest(audio_listens.max_position_sec, excluded.max_position_sec),
    listened_seconds = audio_listens.listened_seconds + excluded.listened_seconds,
    completed = audio_listens.completed or excluded.completed or (
      p_event_type = 'ended' and v_duration_sec is not null
      and audio_listens.listened_seconds + excluded.listened_seconds >= ceil(v_duration_sec * 0.8)
    ),
    completed_at = case
      when audio_listens.completed_at is not null then audio_listens.completed_at
      when excluded.completed or (
        p_event_type = 'ended' and v_duration_sec is not null
        and audio_listens.listened_seconds + excluded.listened_seconds >= ceil(v_duration_sec * 0.8)
      ) then now()
      else null
    end,
    listened_local_date = coalesce(audio_listens.listened_local_date, excluded.listened_local_date);
end;
$$;
revoke all on function public.upsert_audio_listen(uuid, text, integer, integer, uuid) from public, anon;
grant execute on function public.upsert_audio_listen(uuid, text, integer, integer, uuid) to authenticated;

create or replace view public.v_audio_listen_progress with (security_invoker = on) as
select l.user_id, l.audio_id, l.challenge_id, l.day_number,
  l.first_opened_at, l.last_opened_at, l.open_count, l.last_position_sec,
  l.max_position_sec, l.listened_seconds,
  case when a.duration_sec > 0
    then least(100, floor(l.max_position_sec::numeric * 100 / a.duration_sec)::integer)
    else null end as progress_pct,
  l.completed, l.completed_at, l.listened_local_date
from public.audio_listens l
join public.challenge_audios a
  on a.id = l.audio_id and a.challenge_id = l.challenge_id and a.day_number = l.day_number;
grant select on public.v_audio_listen_progress to authenticated;

insert into public.challenges (
  id, slug, title, start_date, duration_days, timezone, unlock_hour,
  delivery_platform, language, is_active
) values (
  'e840ab99-967f-48f4-8a1b-77a6358a64f5',
  'goyo-stillness-2week-20261013',
  '2주 챌린지 오디오 가이드',
  date '2026-10-13', 14, 'Asia/Seoul', 0, 'slack', 'ko', true
)
on conflict (slug) do nothing;

insert into public.challenge_audios (
  challenge_id, day_number, title, body_part, description, storage_path
)
select c.id, day_number, 'TODO', 'TODO', '',
  'goyo-stillness-2week-20261013/day' || day_number || '.mp3'
from public.challenges c
cross join generate_series(1, 14) as days(day_number)
where c.slug = 'goyo-stillness-2week-20261013'
on conflict (challenge_id, day_number) do nothing;
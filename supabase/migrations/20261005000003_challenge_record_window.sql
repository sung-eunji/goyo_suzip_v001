alter table public.challenges
  add column if not exists record_end_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'challenges_record_end_date_check'
      and conrelid = 'public.challenges'::regclass
  ) then
    alter table public.challenges
      add constraint challenges_record_end_date_check
      check (record_end_date is null or record_end_date >= start_date);
  end if;
end;
$$;

update public.challenges
set record_end_date = date '2026-10-27'
where slug = 'goyo-stillness-2week-20261013';

create or replace function public.enforce_challenge_entry_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if not exists (
    select 1
    from public.challenge_participants cp
    join public.challenges c on c.id = cp.challenge_id
    where cp.user_id = new.user_id
      and c.is_active
  ) then
    return new;
  end if;

  if not exists (
    select 1
    from public.challenge_participants cp
    join public.challenges c on c.id = cp.challenge_id
    where cp.user_id = new.user_id
      and c.is_active
      and new.local_date between c.start_date
        and coalesce(c.record_end_date, c.start_date + c.duration_days - 1)
  ) then
    raise exception using
      errcode = 'check_violation',
      message = 'challenge records are allowed only during the challenge record window';
  end if;

  return new;
end;
$$;

drop trigger if exists entries_challenge_record_window on public.entries;
create trigger entries_challenge_record_window
  before insert or update on public.entries
  for each row execute function public.enforce_challenge_entry_window();

drop function if exists public.get_my_challenge_audios(uuid);
create function public.get_my_challenge_audios(p_challenge_id uuid)
returns table (
  challenge_id uuid,
  challenge_slug text,
  challenge_title text,
  start_date date,
  duration_days integer,
  record_end_date date,
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
  select c.id, c.slug, c.title, c.start_date, c.duration_days,
    coalesce(c.record_end_date, c.start_date + c.duration_days - 1),
    c.timezone, c.unlock_hour, public.get_challenge_day(c.id),
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

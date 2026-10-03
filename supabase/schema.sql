-- 고요수집 / Collecting Stillness - normalized analytics schema v2
-- 새 프로젝트 또는 기존 테스트 DB를 초기화한 뒤 Supabase SQL Editor에서 실행하세요.

create extension if not exists pgcrypto;

do $$ begin
  create type public.sensation_category as enum ('tight', 'flow', 'release');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.app_role as enum ('member', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '고요님',
  nickname_key text not null unique,
  gender text check (gender in ('man', 'woman', 'prefer_not_to_say')),
  timezone text not null default 'Asia/Seoul',
  locale text not null default 'ko',
  role public.app_role not null default 'member',
  subscribed boolean not null default false,
  subscribed_until date,
  cohort text,
  is_anonymous boolean not null default true,
  converted_at timestamptz,
  research_consent boolean not null default false,
  research_consent_at timestamptz,
  analysis_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'light',
  reminder_at time,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.vessel_types (
  key text primary key, label_ko text not null, label_en text,
  sort_order int not null default 0, is_active boolean not null default true
);
create table if not exists public.sensation_options (
  key text primary key, category public.sensation_category not null,
  label_ko text not null, label_en text, sort_order int not null default 0,
  is_active boolean not null default true
);
create table if not exists public.body_response_options (
  key text primary key, label_ko text not null, label_en text,
  is_relief boolean not null default true, sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists public.promises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month date not null, text_raw text not null,
  vessel_key text references public.vessel_types(key), target_minutes smallint,
  position smallint not null default 1, is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists promises_user_month_idx on public.promises(user_id, month);
create unique index if not exists promises_active_position_uidx
  on public.promises(user_id, month, position) where is_active;

create table if not exists public.forecasts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null, level smallint not null check (level between 0 and 4),
  created_at timestamptz not null default now(), primary key (user_id, date)
);

create table if not exists public.forecast_event_types (
  key text primary key, label_ko text not null, weight smallint not null check (weight between 0 and 100),
  sort_order int not null default 0, is_active boolean not null default true
);
create table if not exists public.forecast_day_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  event_type text not null references public.forecast_event_types(key),
  event_note text,
  created_at timestamptz not null default now(),
  primary key (user_id, date, event_type)
);
alter table public.forecast_day_events add column if not exists event_note text;
create index if not exists forecast_day_events_user_date_idx on public.forecast_day_events(user_id, date);

create table if not exists public.program_days (
  cohort text not null,
  day_index smallint not null check (day_index between 0 and 13),
  body_system text not null,
  prompt_key text not null,
  created_at timestamptz not null default now(),
  primary key (cohort, day_index)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null, tz text, surge smallint check (surge between 0 and 100),
  no_stillness boolean not null default false, day_note text, app_version text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);
create index if not exists entries_user_date_idx on public.entries(user_id, local_date desc);

create table if not exists public.entry_promise_checks (
  entry_id uuid not null references public.entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  promise_id uuid not null references public.promises(id) on delete cascade,
  done boolean not null default true, minutes smallint,
  primary key (entry_id, promise_id)
);
create table if not exists public.entry_sensations (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category public.sensation_category not null, option_key text references public.sensation_options(key),
  text_raw text, check (option_key is not null or nullif(btrim(text_raw), '') is not null)
);
create unique index if not exists entry_sensations_uniq on public.entry_sensations(entry_id, option_key) where option_key is not null;
create unique index if not exists entry_sensations_text_uniq
  on public.entry_sensations(entry_id, category, lower(btrim(text_raw)))
  where option_key is null and text_raw is not null;

create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text_raw text not null, minutes smallint, vessel_key text references public.vessel_types(key),
  position smallint not null default 1, created_at timestamptz not null default now()
);
create table if not exists public.encounter_responses (
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response_key text not null references public.body_response_options(key),
  primary key (encounter_id, response_key)
);
create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null, note text, share_with_group boolean not null default false,
  created_at timestamptz not null default now(), unique(user_id, week_start)
);
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  survey_key text not null, answers jsonb not null, created_at timestamptz not null default now()
);
create unique index if not exists survey_responses_user_key_idx on public.survey_responses(user_id, survey_key);
create table if not exists public.events (
  id bigserial primary key, user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, props jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_nickname_available(p_nickname text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select nullif(btrim(p_nickname), '') is not null
     and not exists (
       select 1 from public.profiles
       where nickname_key = lower(regexp_replace(btrim(p_nickname), '\s+', ' ', 'g'))
     );
$$;
revoke all on function public.is_nickname_available(text) from public;
grant execute on function public.is_nickname_available(text) to anon, authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nickname text := nullif(btrim(new.raw_user_meta_data ->> 'nickname'), '');
  v_gender text := nullif(new.raw_user_meta_data ->> 'gender', '');
begin
  if v_nickname is null then
    raise exception 'nickname is required';
  end if;

  insert into public.profiles (id, nickname, nickname_key, gender, is_anonymous)
  values (
    new.id,
    v_nickname,
    lower(regexp_replace(btrim(v_nickname), '\s+', ' ', 'g')),
    v_gender,
    coalesce(new.is_anonymous, false)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for all using (id = auth.uid() or public.is_admin()) with check (id = auth.uid());

create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and not public.is_admin() then
    if new.role is distinct from old.role
       or new.cohort is distinct from old.cohort
       or new.research_consent is distinct from old.research_consent
       or new.research_consent_at is distinct from old.research_consent_at
       or new.analysis_id is distinct from old.analysis_id
       or new.subscribed is distinct from old.subscribed
       or new.subscribed_until is distinct from old.subscribed_until then
      raise exception 'permission denied: cannot modify privileged profile columns';
    end if;
  end if;
  if tg_op = 'INSERT' and not public.is_admin() then
    if new.role is distinct from 'member'
       or new.cohort is not null
       or new.research_consent is distinct from false
       or new.research_consent_at is not null
       or new.subscribed is distinct from false
       or new.subscribed_until is not null then
      raise exception 'permission denied: cannot set privileged profile columns on insert';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_privileged_columns_trg on public.profiles;
create trigger profiles_guard_privileged_columns_trg
  before insert or update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

do $$ declare t text; begin
  foreach t in array array['settings','entries','entry_promise_checks','entry_sensations','encounters','encounter_responses','promises','forecasts','forecast_day_events','weekly_reviews','survey_responses','events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_all on public.%I', t);
    execute format('create policy own_all on public.%I for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['vessel_types','sensation_options','body_response_options','forecast_event_types','program_days'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists read_all on public.%I', t);
    execute format('create policy read_all on public.%I for select to authenticated using (true)', t);
    execute format('drop policy if exists admin_write on public.%I', t);
    execute format('create policy admin_write on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

insert into public.vessel_types(key,label_ko,sort_order) values
 ('walk','걷기',10),('read','독서',20),('chores','설거지·집안일',30),('breath','명상·호흡',40),
 ('yoga','스트레칭·요가',50),('bath','목욕·샤워',60),('music','음악',70),('blank','멍때리기',80),
 ('outside','자연·바깥',90),('cook','요리',100),('write','쓰기·그리기',110),('other','기타',999)
on conflict (key) do nothing;
insert into public.body_response_options(key,label_ko,sort_order) values
 ('deep_breath','숨이 깊어졌다',10),('shoulder_down','어깨가 내려갔다',20),('warm_belly','배가 따뜻해졌다',30),
 ('wide_view','시야가 넓어졌다',40),('slow_thought','생각이 느려졌다',50),('no_change','별 변화 없었다',60)
on conflict (key) do nothing;

insert into public.forecast_event_types(key,label_ko,weight,sort_order) values
 ('deadline','마감',85,10),('trip','출장',60,20),('kids','아이 일정',55,30),('other','기타',40,40)
on conflict (key) do nothing;

create or replace view public.v_day with (security_invoker = on) as
select e.id, e.user_id, e.local_date, e.surge, e.no_stillness,
  (select count(*) from public.entry_promise_checks c where c.entry_id = e.id and c.done) as kept_count,
  (select count(*) from public.encounters n where n.entry_id = e.id) as encounter_count,
  (select coalesce(sum(n.minutes), 0) from public.encounters n where n.entry_id = e.id) as encounter_minutes,
  (select count(*) from public.entry_sensations s where s.entry_id = e.id and s.category = 'tight') as tight_count,
  (select count(*) from public.entry_sensations s where s.entry_id = e.id and s.category = 'release') as release_count
from public.entries e;

create or replace view public.v_forecast_score with (security_invoker = on) as
select user_id, date, (level * 25)::smallint as score
from public.forecasts;

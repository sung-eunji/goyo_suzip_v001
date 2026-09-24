-- 급증 예보(forecasts.level)는 지금까지 사용자가 0~4 임의 강도를 직접 골랐다.
-- "실제로 계산된 수치"로 바꾸기 위해: 사용자는 그날의 '일정 유형'만 표시하고,
-- 급증 점수(0~100)는 유형별 가중치 합(최대 100으로 캡)으로 서버에서 계산한다.
-- 하루에 여러 유형을 겹쳐 표시할 수 있으므로 유형은 별도 매핑 테이블로 둔다.
--
-- 기존 forecasts(user_id,date,level) 테이블은 그대로 둔다(파괴적 변경 아님).
-- 앱은 이제 이 테이블 대신 forecast_day_events + v_forecast_score를 사용한다.

create table if not exists public.forecast_event_types (
  key text primary key,
  label_ko text not null,
  weight smallint not null check (weight between 0 and 100),
  sort_order int not null default 0,
  is_active boolean not null default true
);

alter table public.forecast_event_types enable row level security;
drop policy if exists read_all on public.forecast_event_types;
create policy read_all on public.forecast_event_types
  for select to authenticated using (true);
drop policy if exists admin_write on public.forecast_event_types;
create policy admin_write on public.forecast_event_types
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.forecast_event_types (key, label_ko, weight, sort_order) values
  ('deadline', '마감', 85, 10),
  ('trip', '출장', 60, 20),
  ('kids', '아이 일정', 55, 30),
  ('other', '기타', 40, 40)
on conflict (key) do nothing;

create table if not exists public.forecast_day_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  event_type text not null references public.forecast_event_types(key),
  created_at timestamptz not null default now(),
  primary key (user_id, date, event_type)
);

alter table public.forecast_day_events enable row level security;
drop policy if exists own_all on public.forecast_day_events;
create policy own_all on public.forecast_day_events
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create index if not exists forecast_day_events_user_date_idx
  on public.forecast_day_events(user_id, date);

-- 점수 = 그날 표시된 유형들의 weight 합, 100 캡. 공식은 이 뷰 하나에만 있다.
create or replace view public.v_forecast_score with (security_invoker = on) as
select
  fde.user_id,
  fde.date,
  least(100, sum(fet.weight))::smallint as score
from public.forecast_day_events fde
join public.forecast_event_types fet on fet.key = fde.event_type
group by fde.user_id, fde.date;

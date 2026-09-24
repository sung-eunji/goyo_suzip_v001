-- program_days: 코호트별 · day_index(0~13)별로 그날 어떤 신체 부위(body_system)를
-- 다루도록 프롬프트(prompt_key)를 보냈는지 기록하는 마스터 테이블.
-- Q2(어떤 신체 부위를 다룬 날 반응이 가장 높았는가) 분석을 위해 필요하며,
-- 기존 스키마에는 이 정보가 없었다(0단계 실측 보고 공백 항목).

create table if not exists public.program_days (
  cohort text not null,
  day_index smallint not null check (day_index between 0 and 13),
  body_system text not null,
  prompt_key text not null,
  created_at timestamptz not null default now(),
  primary key (cohort, day_index)
);

alter table public.program_days enable row level security;

drop policy if exists read_all on public.program_days;
create policy read_all on public.program_days
  for select to authenticated using (true);

drop policy if exists admin_write on public.program_days;
create policy admin_write on public.program_days
  for all using (public.is_admin()) with check (public.is_admin());

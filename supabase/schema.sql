-- 고요수집 / Collecting Stillness — Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요.
-- (익명 로그인은 Authentication → Providers → "Anonymous sign-ins" 에서 켜야 합니다.)

-- ─────────────────────────────────────────────
-- 1) 테이블
-- ─────────────────────────────────────────────

-- 참가자 프로필 (auth.users 1:1)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null default '고요님',
  is_admin    boolean not null default false,   -- Gee(관리자)만 true
  subscribed  boolean not null default false,   -- 유료 구독 여부 (결제 연동 전엔 수동/관리자 설정)
  created_at  timestamptz not null default now()
);

-- 이 달의 고요 약속 + 물때 예보 (사용자당 1행)
create table if not exists public.settings (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  promises  jsonb not null default '[]'::jsonb,   -- ["약속1","약속2",...]  (최대 3)
  forecast  jsonb not null default '{}'::jsonb    -- {"2026-09-11": 3, ...}  강도 0~4
);

-- 하루 기록 (사용자 × 날짜)
create table if not exists public.entries (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  date        text not null,                        -- 'YYYY-MM-DD'
  surge       int  not null default 0,              -- 몰아침 게이지 0~100
  kept        jsonb not null default '[]'::jsonb,    -- 들인 고요: 약속 인덱스 배열
  met         jsonb,                                 -- 찾아온 고요: {moment, min, feel:[]} 또는 null
  body        jsonb not null default '[]'::jsonb,    -- 몸 감각 태그 배열
  none        boolean not null default false,        -- "고요가 없었어요"
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);

-- ─────────────────────────────────────────────
-- 2) 관리자 판별 함수 (RLS에서 재귀 없이 쓰기 위해 security definer)
-- ─────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ─────────────────────────────────────────────
-- 3) RLS (Row Level Security)
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.entries  enable row level security;

-- profiles: 본인 것 CRUD, 관리자는 전체 열람
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (auth.uid() = id or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (auth.uid() = id);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
-- 참고: is_admin / subscribed 는 참가자가 스스로 바꾸지 못하게 하려면
--       별도 컬럼 권한(REVOKE) 또는 트리거로 잠그는 것을 권장. 파일럿에선 관리자가 SQL로 설정.

-- settings: 본인 것만, 관리자는 열람
drop policy if exists settings_all on public.settings;
create policy settings_all on public.settings for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- entries: 본인 것만, 관리자는 열람
drop policy if exists entries_all on public.entries;
create policy entries_all on public.entries for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 4) 관리자 지정 (Gee 계정)
--    앱에서 한 번 로그인/시작해 프로필이 생긴 뒤, 아래로 본인을 관리자로:
--    select id, nickname from public.profiles order by created_at;   -- 내 id 확인
--    update public.profiles set is_admin = true, subscribed = true where id = '여기에-내-uuid';
-- ─────────────────────────────────────────────

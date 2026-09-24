-- 20260921000001의 REVOKE 방식은 실효가 없었다: Supabase 기본 설정이
-- authenticated/anon에 테이블 단위(컬럼 지정 없는) UPDATE/INSERT 권한을
-- 이미 부여하고 있어서(PostgREST가 RLS만으로 쓰기를 막는 구조), 그 위에
-- 컬럼 단위 REVOKE를 걸어도 테이블 단위 권한이 우선해 무시된다.
-- 실제로 라이브 재검증에서 REVOKE 이후에도 role 자가승격이 그대로 됐다.
-- 트리거로 컬럼 값 변경 자체를 막는 방식(옵션 b)으로 교체한다.

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
       or new.subscribed_until is distinct from old.subscribed_until
    then
      raise exception 'permission denied: cannot modify privileged profile columns';
    end if;
  end if;

  if tg_op = 'INSERT' and not public.is_admin() then
    if new.role is distinct from 'member'
       or new.cohort is not null
       or new.research_consent is distinct from false
       or new.research_consent_at is not null
       or new.subscribed is distinct from false
       or new.subscribed_until is not null
    then
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

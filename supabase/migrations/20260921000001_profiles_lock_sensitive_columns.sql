-- profiles.role 등 민감 컬럼 권한 상승 방지
-- 문제: profiles_self RLS 정책의 with_check가 (id = auth.uid())만 검사하고
-- 어떤 컬럼이 바뀌는지는 검사하지 않는다. authenticated 롤은 테이블 단위로
-- 모든 컬럼 UPDATE/INSERT 권한을 갖고 있어(Supabase 기본 grant),
-- 로그인한 사용자가 자기 자신의 role을 'admin'으로 바꿀 수 있었다.
-- 아래는 옵션 (a): 사용자가 스스로 바꾸면 안 되는 컬럼의 쓰기 권한을 컬럼 단위로 회수한다.

revoke update (
  role,
  cohort,
  research_consent,
  research_consent_at,
  analysis_id,
  subscribed,
  subscribed_until
) on public.profiles from authenticated, anon;

revoke insert (
  role,
  cohort,
  research_consent,
  research_consent_at,
  analysis_id,
  subscribed,
  subscribed_until
) on public.profiles from authenticated, anon;

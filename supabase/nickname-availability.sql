-- 신규 익명 시작 전에 닉네임 사용 가능 여부만 안전하게 확인하는 RPC
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
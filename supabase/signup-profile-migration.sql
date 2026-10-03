-- 회원가입 성별 정보와 Auth 사용자 생성 시 profiles 자동 생성
alter table public.profiles add column if not exists gender text;

do $$ begin
  alter table public.profiles drop constraint if exists profiles_gender_check;
  alter table public.profiles add constraint profiles_gender_check
    check (gender is null or gender in ('man', 'woman', 'prefer_not_to_say'));
exception when duplicate_object then null; end $$;

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
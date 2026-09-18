-- 닉네임 중복 방지 마이그레이션
-- 기존 profiles 데이터를 보존하면서 닉네임 비교 키를 추가합니다.

alter table public.profiles add column if not exists nickname_key text;

update public.profiles
set nickname = coalesce(nullif(btrim(nickname), ''), '고요님')
where nickname is null or btrim(nickname) = '';

update public.profiles
set nickname_key = lower(regexp_replace(btrim(nickname), '\s+', ' ', 'g'))
where nickname_key is null;

alter table public.profiles alter column nickname set default '고요님';
alter table public.profiles alter column nickname set not null;
alter table public.profiles alter column nickname_key set not null;

create unique index if not exists profiles_nickname_key_uidx
on public.profiles(nickname_key);

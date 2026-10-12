insert into public.challenge_audios (
  challenge_id, day_number, title, body_part, description, storage_path
)
select
  c.id,
  2,
  '날숨 끝의 틈 찾기',
  '호흡',
  '',
  'goyo-stillness-2week-20261013/day2.m4a'
from public.challenges c
where c.slug = 'goyo-stillness-2week-20261013'
on conflict (challenge_id, day_number) do update
set title = excluded.title,
    body_part = excluded.body_part,
    description = excluded.description,
    storage_path = excluded.storage_path;
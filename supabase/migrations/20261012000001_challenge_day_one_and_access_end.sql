update public.challenges
set record_end_date = date '2026-10-27'
where slug = 'goyo-stillness-2week-20261013';

update public.challenge_audios a
set title = '숨이 들어오는 자리',
    body_part = '몸 전체',
    description = '',
    storage_path = 'goyo-stillness-2week-20261013/day1.m4a'
from public.challenges c
where a.challenge_id = c.id
  and c.slug = 'goyo-stillness-2week-20261013'
  and a.day_number = 1;

delete from public.challenge_audios a
using public.challenges c
where a.challenge_id = c.id
  and c.slug = 'goyo-stillness-2week-20261013'
  and a.day_number > 1
  and a.title = 'TODO';

drop policy if exists challenge_audio_open_read on public.challenge_audios;
create policy challenge_audio_open_read on public.challenge_audios
  for select using (
    public.is_admin()
    or (
      day_number <= public.get_challenge_day(challenge_id)
      and exists (
        select 1
        from public.challenge_participants cp
        join public.challenges c on c.id = cp.challenge_id
        where cp.challenge_id = public.challenge_audios.challenge_id
          and cp.user_id = auth.uid()
          and c.is_active
          and timezone(c.timezone, statement_timestamp())::date
            between c.start_date
            and coalesce(c.record_end_date, c.start_date + c.duration_days - 1)
      )
    )
  );

drop policy if exists challenge_audio_storage_open_read on storage.objects;
create policy challenge_audio_storage_open_read on storage.objects
  for select using (
    bucket_id = 'challenge-audio'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.challenge_audios a
        join public.challenge_participants cp on cp.challenge_id = a.challenge_id
        join public.challenges c on c.id = a.challenge_id
        where a.storage_path = storage.objects.name
          and cp.user_id = auth.uid()
          and a.day_number <= public.get_challenge_day(a.challenge_id)
          and c.is_active
          and timezone(c.timezone, statement_timestamp())::date
            between c.start_date
            and coalesce(c.record_end_date, c.start_date + c.duration_days - 1)
      )
    )
  );
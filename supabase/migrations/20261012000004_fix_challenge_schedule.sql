update public.challenges
set start_date = date '2026-10-13',
    duration_days = 14,
    timezone = 'Asia/Seoul',
    unlock_hour = 0,
    record_end_date = date '2026-10-27',
    is_active = true
where slug = 'goyo-stillness-2week-20261013';

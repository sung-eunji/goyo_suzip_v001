-- Store schedule labels independently from the user's four-step surge estimate.
alter table public.forecast_day_events add column if not exists event_note text;

create or replace view public.v_forecast_score with (security_invoker = on) as
select user_id, date, (level * 25)::smallint as score
from public.forecasts;
-- Prevent concurrent/repeated UI saves from creating duplicate active promises or tags.
create unique index if not exists promises_active_position_uidx
  on public.promises(user_id, month, position) where is_active;

create unique index if not exists entry_sensations_text_uniq
  on public.entry_sensations(entry_id, category, lower(btrim(text_raw)))
  where option_key is null and text_raw is not null;
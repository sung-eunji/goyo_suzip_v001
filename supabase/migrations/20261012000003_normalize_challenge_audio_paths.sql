update public.challenge_audios
set storage_path = split_part(
  regexp_replace(
    storage_path,
    '^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/challenge-audio/',
    ''
  ),
  '?',
  1
)
where storage_path ~ '^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/challenge-audio/';
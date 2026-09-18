-- v1 테스트 DB를 비우고 v2 스키마를 새로 시작할 때만 실행하세요.
-- 기존 profiles, entries, settings 데이터가 삭제됩니다.

drop view if exists public.v_day cascade;
drop table if exists public.events cascade;
drop table if exists public.survey_responses cascade;
drop table if exists public.weekly_reviews cascade;
drop table if exists public.encounter_responses cascade;
drop table if exists public.encounters cascade;
drop table if exists public.entry_sensations cascade;
drop table if exists public.entry_promise_checks cascade;
drop table if exists public.entries cascade;
drop table if exists public.forecasts cascade;
drop table if exists public.promises cascade;
drop table if exists public.body_response_options cascade;
drop table if exists public.sensation_options cascade;
drop table if exists public.vessel_types cascade;
drop table if exists public.settings cascade;
drop table if exists public.profiles cascade;
drop type if exists public.sensation_category cascade;
drop type if exists public.app_role cascade;

-- 이후 schema.sql 전체를 실행하세요.

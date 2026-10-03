# 고요수집 데이터 사전과 날짜 기준

- 기준일: 2026-10-03
- Supabase 프로젝트: `Goyo_suzip_v.001` (`ehhnkxmrjpzgsazpckjq`)
- 범위: 현재 회원가입 폼, 앱 저장 코드, 원격 Supabase 스키마

## 1. 회원가입 정보

| 사용자가 입력하는 값 | 저장 위치                      | 저장/사용 방식                                                        |
| -------------------- | ------------------------------ | --------------------------------------------------------------------- |
| 이메일               | `auth.users.email`             | Supabase Auth의 계정 로그인 식별자. `public.profiles`에 복사하지 않음 |
| 비밀번호             | Supabase Auth 내부             | 앱/DB에 평문으로 저장하지 않음. Supabase Auth가 관리                  |
| 비밀번호 확인        | 저장 안 함                     | 회원가입 화면에서 두 값이 같은지 비교한 뒤 폐기                       |
| 닉네임               | `public.profiles.nickname`     | 화면 인사말에 사용                                                    |
| 닉네임 비교 키       | `public.profiles.nickname_key` | 공백/대소문자를 정리해 중복 닉네임 가입을 막는 유일 키                |
| 성별                 | `public.profiles.gender`       | `man`, `woman`, `prefer_not_to_say` 중 하나                           |
| 휴대폰               | 저장 안 함                     | 회원가입 항목에서 제외                                                |

Auth 사용자와 앱 프로필은 같은 UUID로 연결됩니다.

```text
auth.users.id = public.profiles.id
```

가입 요청의 닉네임/성별은 Auth metadata로 전달되고, `auth.users` INSERT 트리거 `on_auth_user_created_profile`이 `profiles` 행을 생성합니다. 닉네임 중복 여부는 `is_nickname_available()`이 미리 확인하고, 최종 중복은 `nickname_key` 유일 인덱스가 막습니다.

로그인할 때는 이메일과 비밀번호를 확인하고, 성공 후 `profiles.id`로 프로필을 읽어 화면에서 닉네임으로 부릅니다. 닉네임은 로그인 자격증명이 아닙니다.

## 2. 사용자가 입력하는 데이터와 저장 테이블

| 입력/행동                       | 저장 테이블과 주요 컬럼                                           | 연결 키                                                            |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| 이번 달 고요 약속               | `promises.text_raw`, `month`, `position`, `is_active`             | `promises.user_id -> profiles.id`                                  |
| 날짜별 일정 예보 유형/기타 설명 | `forecast_day_events.date`, `event_type`, `event_note`            | `user_id -> profiles.id`, `event_type -> forecast_event_types.key` |
| 사용자가 선택한 급증도          | `forecasts.date`, `level` (0–4)                                   | `user_id -> profiles.id`; 화면 점수는 `level × 25%`                |
| 실제 몰아침과 상황 메모         | `entries.surge`, `day_note`, `no_stillness`, `local_date`, `tz`   | `entries.user_id -> profiles.id`                                   |
| 그날 지킨 약속                  | `entry_promise_checks.done`, `minutes`                            | `entry_id -> entries.id`, `promise_id -> promises.id`              |
| 몸 감각 태그                    | `entry_sensations.category`, `option_key` 또는 `text_raw`         | `entry_id -> entries.id`                                           |
| 뜻밖에 찾아온 고요              | `encounters.text_raw`, `minutes`, 선택적 `vessel_key`             | `entry_id -> entries.id`                                           |
| 고요 뒤 몸의 응답               | `encounter_responses.response_key`                                | `encounter_id -> encounters.id`                                    |
| 오늘 필요한 변화/니즈/해결감    | `survey_responses.answers` JSONB, `survey_key = daily:YYYY-MM-DD` | `survey_responses.user_id -> profiles.id`                          |
| 주간 회고                       | `weekly_reviews.note`, `week_start`, `share_with_group`           | `weekly_reviews.user_id -> profiles.id`                            |
| 제품 사용 이벤트                | `events.name`, `props`, `occurred_at`                             | `events.user_id -> profiles.id`                                    |

`settings`에는 테마·알림 시각 등 UI 설정을 저장합니다. 분석 대상인 일일 관찰은 `settings`에 넣지 않습니다.

### 이번 달 일정·급증 예보

달력에서 날짜를 열고 마감·출장·아이 일정·기타를 별도로 표시합니다. 기타 선택 시 입력한 메모는 `forecast_day_events.event_note`에 저장됩니다. 같은 날짜의 급증 예상은 `forecasts.level`에 0–4로 따로 저장하며 화면 단계는 `낮음 0%`, `중약 25%`, `중간 50%`, `중강 75%`, `높음 100%`입니다. 달력 칸 높이와 `v_forecast_score.score`는 항상 `level × 25`입니다. 예보 점수는 일정 종류별 가중치 합산이 아니므로 일정이 여러 개여도 선택한 급증 단계가 그대로 유지됩니다.

## 3. 날짜와 시각의 의미

날짜와 시각은 용도가 다르므로 서로 대체해서 읽으면 안 됩니다.

| 컬럼                                          | 테이블                | 의미                                                                                           |
| --------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| `entries.local_date` (`date`)                 | `entries`             | 사용자의 현지 달력 기준으로 기록한 날. 하루 기록의 업무/분석 날짜                              |
| `entries.tz` (`text`)                         | `entries`             | 저장 당시 브라우저 시간대. 예: `Asia/Seoul`                                                    |
| `entries.created_at` (`timestamptz`)          | `entries`             | 이 날짜 기록 행이 DB에 처음 만들어진 실제 시각(UTC 기준 instant)                               |
| `entries.updated_at` (`timestamptz`)          | `entries`             | 마지막으로 기록을 저장/수정한 시각                                                             |
| `encounters.created_at` (`timestamptz`)       | `encounters`          | 찾아온 고요 행을 DB에 기록한 시각. 소속 `entry_id`를 따라가면 해당 현지 기록 날짜를 알 수 있음 |
| `promises.month` (`date`)                     | `promises`            | 약속이 적용되는 달의 1일. 예: `2026-10-01`                                                     |
| `forecast_day_events.date` (`date`)           | `forecast_day_events` | 일정이 예상되는 미래/당일 날짜                                                                 |
| `forecasts.date` (`date`)                     | `forecasts`           | 급증도 선택 날짜. `level` 0–4를 저장하고 뷰가 0/25/50/75/100%로 계산                           |
| `survey_responses.created_at` (`timestamptz`) | `survey_responses`    | 설문 답변을 최초 저장한 시각. 일별 답변 날짜는 `survey_key`에도 포함                           |
| `events.occurred_at` (`timestamptz`)          | `events`              | 제품 이벤트가 실제 발생했다고 기록한 시각                                                      |
| `weekly_reviews.week_start` (`date`)          | `weekly_reviews`      | 회고가 가리키는 주의 시작 날짜. 화면 날짜 계산은 현재 일요일 시작 기준                         |
| `program_days.day_index`                      | `program_days`        | 코호트 안에서의 상대 일차. 실제 달력 날짜가 아님                                               |

### 하루 중복 방지

```text
UNIQUE (user_id, local_date)
```

한 사용자는 한 `local_date`에 `entries` 한 행만 가집니다. 저장을 다시 누르면 같은 행을 upsert하므로 `created_at`은 유지되고 `updated_at`이 바뀝니다. 새 시간대로 이동하더라도 과거 기록 날짜는 당시 입력한 `local_date`와 `tz`로 해석합니다.

## 4. 테이블 관계 요약

```text
auth.users
  └─ profiles (1:1, 같은 id)
      ├─ promises (사용자·월별)
      ├─ forecast_day_events (사용자·날짜·일정유형·기타설명별)
      ├─ forecasts (사용자·날짜별 급증 단계 0–4)
      ├─ entries (사용자·현지날짜별 1행)
      │   ├─ entry_promise_checks ── promises
      │   ├─ entry_sensations
      │   └─ encounters
      │       └─ encounter_responses
      ├─ survey_responses
      ├─ weekly_reviews
      └─ events
```

중요한 유일성:

- `profiles.id`: Auth 사용자당 프로필 하나
- `profiles.nickname_key`: 표시 닉네임 중복 금지
- `entries(user_id, local_date)`: 사용자/현지날짜별 일일 기록 한 행
- `forecast_day_events(user_id, date, event_type)`: 같은 일정유형 중복 방지
- `forecasts(user_id, date)`: 날짜별 급증 단계 한 건
- `survey_responses(user_id, survey_key)`: 같은 일자/설문 답변 중복 방지

## 5. 관리자가 보는 데이터와 조합

### 현재 관리자 화면

- `profiles`: 닉네임, 가입일, 구독 상태
- `v_day`: 사용자별 기록일 수, 평균 몰아침, 지킨 약속 수, 뜻밖의 고요 시간, 고요가 없던 날, 마지막 기록일
- CSV: 닉네임과 사용자 ID, 날짜별 `v_day` 집계 컬럼

### DB에서 가능한 분석 조합

- `profiles.id = entries.user_id`: 사람/코호트와 날짜별 상태 연결
- `entries.id = entry_sensations.entry_id`: 몰아침 정도와 몸 감각 연결
- `entries.id = entry_promise_checks.entry_id`, `promises.id = entry_promise_checks.promise_id`: 약속 유형과 실천 연결
- `entries.id = encounters.entry_id`, `encounters.id = encounter_responses.encounter_id`: 찾아온 고요와 몸의 응답 연결
- `(user_id, date)`로 `forecast_day_events`, `forecasts`/`v_forecast_score`, `entries` 연결: 일정 맥락·예상 강도와 실제 몰아침 비교
- `survey_responses.answers`: 니즈, 기대 변화, 해결감을 날짜/코호트별로 집계

관리자 RLS는 `profiles`와 사용자 데이터 행을 읽도록 허용하지만, 현재 관리자 UI는 전체 컬럼을 표시하지 않고 집계 위주입니다. 이메일은 `auth.users`에 있으며 일반 `profiles` 조회나 현재 CSV에 포함하지 않습니다. 성별은 `profiles.gender`에 저장되지만 현재 관리자 요약 화면/CSV에는 표시되지 않습니다.

연구 분석 파일에는 직접 식별자인 이메일이나 Auth UUID 대신 `analysis_id`를 사용하고, `research_consent`가 허용한 참가자만 포함하는 흐름이 바람직합니다. 현재 이 동의 필터링은 CSV 내보내기에 아직 구현되지 않았습니다.

## 6. 현재 DB 적용 상태와 주의

- Auth 사용자 생성 시 `profiles`를 만드는 원격 트리거: `on_auth_user_created_profile`
- 관리자 컬럼 보호: `profiles_guard_privileged_columns_trg`의 BEFORE INSERT/UPDATE
- 관리자 판별: `is_admin()`
- 닉네임 가능 여부: `is_nickname_available(text)`
- 일별 분석: `v_day`
- 예보 점수 분석: `v_forecast_score`는 `forecasts.level × 25`로 0/25/50/75/100%를 반환
- `profiles.gender` 허용값은 적용 마이그레이션 후 `man`, `woman`, `prefer_not_to_say`; 선택을 DB에서도 제한
- `entries.local_date`는 사용자 날짜, `created_at/updated_at`은 시스템 시각이므로 리텐션/기록 시각 분석에서 별도 사용

일일 저장은 앱에서 여러 PostgREST 요청으로 나뉘어 실행되며 아직 하나의 DB 트랜잭션/RPC는 아닙니다. 중간 요청이 실패하면 하루 데이터 일부만 들어갈 수 있으므로 파일럿 운영 전 원자적 저장 RPC와 저장 실패 UI를 추가하는 것이 좋습니다.

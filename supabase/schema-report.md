# Supabase DB 스키마 현황 보고서

- 프로젝트: `Goyo_suzip_v.001`
- 프로젝트 Ref: `ehhnkxmrjpzgsazpckjq`
- 기준일: 2026-09-18
- 확인 기준: 원격 Supabase DB 직접 조회

## 1. 전체 구성

현재 원격 DB에는 15개 기본 테이블과 1개 분석 뷰가 있습니다.

### 사용자와 설정

- `profiles`
- `settings`

### 분석 기준 마스터

- `vessel_types`
- `sensation_options`
- `body_response_options`

### 월간 데이터

- `promises`
- `forecasts`

### 일일 기록

- `entries`
- `entry_promise_checks`
- `entry_sensations`
- `encounters`
- `encounter_responses`

### 회고와 운영

- `weekly_reviews`
- `survey_responses`
- `events`

### 분석 뷰

- `v_day`

## 2. 사용자 식별과 중복 방지

실제 사용자 식별자는 닉네임이 아니라 다음 조합입니다.

```text
auth.users.id = profiles.id
```

`profiles` 주요 컬럼:

| 컬럼               | 역할                                        |
| ------------------ | ------------------------------------------- |
| `id`               | Supabase Auth 사용자 UUID, 실제 기본 식별자 |
| `nickname`         | 화면 표시용 닉네임                          |
| `nickname_key`     | 공백을 정리한 닉네임 비교 키                |
| `analysis_id`      | 분석/내보내기용 가명 ID                     |
| `is_anonymous`     | 익명 사용자 여부                            |
| `converted_at`     | 이메일 계정으로 전환한 시점                 |
| `cohort`           | 파일럿 그룹 구분                            |
| `research_consent` | 연구·분석 동의 여부                         |

### 적용된 중복 방지

- `profiles.nickname_key` 유일 인덱스: `profiles_nickname_key_uidx`
- `entries (user_id, local_date)` 유일 제약
- `survey_responses (user_id, survey_key)` 유일 인덱스
- `forecasts (user_id, date)` 기본키
- `weekly_reviews (user_id, week_start)` 유일 제약

같은 닉네임으로 새 프로필을 만들 수 없으며, 앱에서는 중복 닉네임 입력 시 새 익명 계정을 만들지 않고 오류를 표시합니다.

다른 브라우저에서 같은 기록을 보려면 닉네임이 아니라 이메일 계정으로 전환한 뒤 로그인해야 합니다. 닉네임만으로 기존 계정에 자동 연결하면 다른 사람이 기록을 볼 수 있기 때문입니다.

## 3. RLS 정책

모든 기본 테이블에 RLS가 활성화되어 있습니다.

```text
rls_enabled: true
force_rls: false
```

일반 사용자 데이터 테이블의 기본 정책:

```sql
user_id = auth.uid() OR is_admin()
```

쓰기 검증:

```sql
user_id = auth.uid()
```

따라서 일반 사용자는 자신의 데이터만 조회·수정할 수 있고, 관리자는 전체 데이터를 조회할 수 있습니다.

### 마스터 테이블 정책

대상:

- `vessel_types`
- `sensation_options`
- `body_response_options`

권한:

- 로그인 사용자: 조회 가능
- 관리자: 수정 가능

현재 정책은 모두 `PERMISSIVE` 정책입니다. 각 데이터 테이블에는 사용자 소유권 정책이 하나씩 적용되어 있어 현재 조건에서는 의도한 사용자별 격리가 작동합니다.

## 4. 등록된 함수

현재 원격 DB에 등록된 public 함수는 1개입니다.

### `public.is_admin()`

```sql
select coalesce(
  (select role = 'admin'
   from public.profiles
   where id = auth.uid()),
  false
);
```

속성:

- `LANGUAGE sql`
- `STABLE`
- `SECURITY DEFINER`
- `search_path = public`
- 반환값: `boolean`

관리자 지정은 다음과 같이 합니다.

```sql
update public.profiles
set role = 'admin'
where id = '사용자-UUID';
```

## 5. 트리거

현재 원격 DB에 등록된 트리거는 없습니다.

```text
트리거: 0개
```

따라서 현재 자동화되지 않은 항목은 다음과 같습니다.

- `updated_at` 자동 갱신
- 닉네임 자동 정규화
- 자유 텍스트 자동 분류
- 프로필 자동 생성
- 일일 기록 전체 저장 트랜잭션

현재 여러 테이블 저장은 앱의 `src/lib/store.js`가 직접 처리합니다.

## 6. 분석 뷰

### `v_day`

일일 기록을 분석하기 쉽게 한 줄로 집계합니다.

포함 항목:

- `local_date`
- `surge`
- `no_stillness`
- 실행한 약속 수: `kept_count`
- 찾아온 고요 횟수: `encounter_count`
- 찾아온 고요 총 시간: `encounter_minutes`
- 조임 감각 수: `tight_count`
- 풀림 감각 수: `release_count`

관리자 통계와 CSV 내보내기에서 사용합니다.

## 7. 현재 데이터 건수

원격 DB에서 확인된 현재 데이터 건수입니다.

| 테이블             | 행 수 |
| ------------------ | ----: |
| `profiles`         |     1 |
| `entries`          |     0 |
| `promises`         |     0 |
| `forecasts`        |     0 |
| `survey_responses` |     0 |
| `events`           |     0 |

현재 프로필 1개가 있고, 실제 일일 기록 데이터는 아직 없습니다.

## 8. 적용 완료 항목

- v2 정규화 테이블
- 사용자별 RLS
- 관리자 역할 기반 권한
- `nickname_key` 유일성
- 사용자·날짜별 기록 중복 방지
- 사용자·설문 키별 응답 중복 방지
- 분석용 `v_day` 뷰
- `is_admin()` 함수
- 원격 Supabase DB 적용 완료

## 9. 아직 적용하지 않은 항목

- `save_day()` RPC 함수
- 자유 텍스트 자동 분류 함수
- 자동 `updated_at` 트리거
- 이벤트 기록 저장 자동화
- 관리자용 추가 분석 뷰

현재 구조는 기본 데이터 모델과 접근 제어는 DB가 담당하고, 기록 저장 순서는 앱 코드가 담당하는 형태입니다.

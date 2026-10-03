# 고요수집 · Collecting Stillness

몰아치는 일상 속에서 하루 2분, 몰아침 전후의 **고요**를 기록하는 감각 트래커.
React + Vite + Supabase. 외부 참가자 누구나 가입 없이 시작 → 나중에 계정 전환 → 구독.

- **오늘 · 이번 달** = 무료 (기록 + 물때 예보)
- **이번 주 · 흐름 · 전체 히스토리** = 구독(월 3,000~5,000원, 결제는 추후 연동) — 지금은 관리자가 열어줌
- **관리자(Gee)** 는 참가자 전체 기록을 한 화면에서 보고 CSV로 내려받음

---

## 1. 준비물

- Node.js 18+ (`node -v`로 확인)
- Supabase 프로젝트 (무료 플랜으로 충분)

## 2. Supabase 설정 (한 번만)

1. https://supabase.com → 새 프로젝트 생성 (이미 계정 있음).
2. **SQL Editor** → `supabase/schema.sql` 내용을 실행합니다. 테이블, 관계, RLS, 함수, 트리거, 분석 뷰와 기준 선택지가 생성됩니다.
3. **Authentication → Providers → Email**을 켭니다. 이메일 인증을 켜두면 회원가입 뒤 인증 메일이 발송됩니다. 실제 메일 발송 테스트/운영에는 사용자 지정 SMTP 설정을 권장합니다.
4. **Project Settings → API** 에서 `Project URL` 과 `anon public` 키를 복사.

## 3. 로컬 실행

```bash
cp .env.example .env      # 그리고 .env 안에 URL / anon key 붙여넣기
npm install
npm run dev               # http://localhost:5173
```

### 2주 실험실 빌드

Slack 파일럿은 `develop` 브랜치에서 pilot 잠금을 켭니다. 주/흐름 탭은 흐릿한 미리보기와 “곧 런칭”을 표시하고, 오늘/이번 달만 실제 이용할 수 있습니다.

```bash
npm run dev:pilot
npm run build:pilot
```

`develop` 브랜치에서는 기본 `npm run dev`와 `npm run build`가 pilot mode로 동작합니다. 구매 체험용 `main` 브랜치는 기본 명령이 일반 구독 모드입니다. `develop`은 `.env.pilot`의 `VITE_PILOT_MODE=true`로 주/흐름을 잠그므로 같은 Supabase DB를 사용해도 구독 상태와 관계없이 참가자에게 잠금 미리보기를 보여줍니다.

### 이메일 확인·비밀번호 재설정 URL

Supabase 대시보드의 **Authentication → URL Configuration**에서 다음을 설정합니다.

- **Site URL**: `http://localhost:5173`
- **Redirect URLs**에 추가: `http://localhost:5173/**`
- `127.0.0.1` 주소로 앱을 열 때도 있으므로 추가: `http://127.0.0.1:5173/**`

앱의 비밀번호 재설정 기능은 현재 브라우저 주소를 redirect URL로 전달합니다. 이미 `localhost:3000`으로 발송된 메일 링크는 목적지가 바뀌지 않으므로, URL 설정 후 앱 로그인 화면의 **비밀번호를 잊으셨나요?**에서 새 메일을 요청하세요.

## 4. 관리자(나) 지정 + 구독 열기

회원가입 후 `profiles`에 내 프로필이 생성됩니다. Supabase **SQL Editor**에서 내 ID를 확인하고:

```sql
select id, nickname, created_at from public.profiles order by created_at;   -- 내 id 확인
update public.profiles set role = 'admin', subscribed = true where id = '내-uuid';
```

- `role = 'admin'` → 앱에 **관리자** 탭이 생기고 참가자 데이터를 조회.
- `subscribed = true` → 이번 주·흐름 잠금 해제. 파일럿에서 참가자에게 열어주려면 그 사람 행의 `subscribed`를 true로.

## 5. 배포 (Vercel 예시)

1. 이 폴더를 GitHub 저장소로 push (`.env`는 `.gitignore`로 제외됨).
2. Vercel → New Project → 저장소 선택 (Framework: **Vite** 자동 감지).
3. **Environment Variables** 에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가.
4. Deploy. (Netlify도 동일 — build command `npm run build`, publish dir `dist`.)
5. 배포된 주소를 슬랙(HOC) 참가자에게 공유하면 끝.

> `anon key`는 브라우저에 공개돼도 되는 키입니다. 실제 접근 통제는 **RLS(Row Level Security)** 가 합니다.
> 참가자는 자기 데이터만 읽고 쓰며, `role = 'admin'`인 계정은 허용된 사용자 데이터를 조회합니다.

---

## 구조

```
src/
  supabaseClient.js     Supabase 클라이언트 + "로그인 유지" 저장 어댑터
  lib/
    data.js             문구 50 · 몸감각 · 날짜 헬퍼 · 데모 시드 (순수)
    render.js           주간 물결 & 월간 차트 SVG 빌더 (순수)
    store.js            인증 + 프로필 + 저널(설정/기록) + 관리자 조회
  components/
    Auth.jsx            이메일 회원가입 / 로그인
    WaveGauge.jsx       몰아침 물결 게이지(canvas)
    AppShell.jsx        인사말 + 매일 랜덤 문구 + 탭 + 잠금 + 전환 모달
  pages/
    DayPage / MonthPage / WeekPage / ChartPage / GuidePage / LockedPage / AdminPage
supabase/schema.sql     테이블 + RLS + Auth/보호 트리거 + 분석 뷰
```

## 온보딩·과금 모델

1. **회원가입** — 이메일, 성별, 닉네임, 비밀번호를 입력합니다. 이메일 인증이 켜져 있으면 인증 후 등록한 이메일로 로그인합니다.
2. **로그인** — 이메일과 비밀번호를 사용합니다. 로그인 후 앱은 프로필 닉네임으로 인사합니다.
3. **2주 실험실** — Slack 참가자는 `develop` pilot build를 사용합니다. 오늘·이번 달은 기록 가능하고, 이번 주·흐름은 미리보기와 곧 출시 안내를 표시합니다.
4. **구독** — 무료는 오늘·이번 달. 돌아보기(이번 주·흐름)는 `subscribed`가 true여야 열림.

### 사용자 식별 규칙

- 실제 사용자 식별자는 `profiles.id`와 `auth.users.id`입니다.
- 닉네임은 표시명이며, 공백을 정리한 `profiles.nickname_key`에 유일 제약이 있습니다.
- 이미 사용 중인 닉네임으로 새 익명 계정을 만들 수는 없습니다.
- 같은 브라우저의 기존 익명 세션은 자동으로 이어집니다. 다른 브라우저나 기기에서 같은 기록을 보려면 이메일 계정으로 전환한 뒤 로그인해야 합니다. 닉네임만으로 기존 계정에 연결하면 다른 사람이 기록을 볼 수 있으므로 지원하지 않습니다.

## 결제 연동 (다음 단계)

지금은 `LockedPage`의 "구독하기" 버튼이 자리만 잡고 있습니다. 실제 결제는 나중에:

- **Toss Payments**(국내 정기결제) 또는 **Stripe Billing** 연동.
- 결제 성공 웹훅 → `profiles.subscribed = true` 로 갱신 (Supabase Edge Function 권장).
- 버튼 `onClick`을 결제 위젯 호출로 교체하면 됩니다.

## 참고 / 주의

- 하루 기록은 `entries` 테이블에 (user_id, date) 한 행. 설정(약속·예보)은 `settings` 한 행.
- 관리자 상세 분석은 **관리자 탭 → CSV 내려받기** 또는 Supabase 대시보드에서.
- `profiles.role` / `subscribed` 등 권한 컬럼은 DB 보호 트리거가 일반 사용자의 변경을 차단합니다.
- 현재 회원가입 필드, 사용자 기록 테이블, 테이블 간 연결 및 현지 기록 날짜 기준은 [데이터 사전](supabase/data-dictionary-and-dates.md)을 참고하세요.

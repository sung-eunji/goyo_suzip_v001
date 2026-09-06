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
2. **SQL Editor** → `supabase/schema.sql` 내용을 붙여넣고 **Run**. (테이블 3개 + RLS + is_admin 함수 생성)
3. **Authentication → Providers → Email**: 그대로 켜둔 채,
   - **Anonymous sign-ins** 를 **켭니다** (가입 없이 시작을 위해 필수).
   - 파일럿에서 전환을 매끄럽게 하려면 **"Confirm email"(이메일 인증)** 을 꺼두는 걸 권장
     (Authentication → Sign In / Providers 또는 Email 설정). 켜두면 익명→정식 전환 시 인증 메일이 갑니다.
4. **Project Settings → API** 에서 `Project URL` 과 `anon public` 키를 복사.

## 3. 로컬 실행
```bash
cp .env.example .env      # 그리고 .env 안에 URL / anon key 붙여넣기
npm install
npm run dev               # http://localhost:5173
```

## 4. 관리자(나) 지정 + 구독 열기
앱에서 한 번 "시작하기"로 들어가면 내 프로필 행이 생깁니다. 그 다음 Supabase **SQL Editor**에서:
```sql
select id, nickname, created_at from public.profiles order by created_at;   -- 내 id 확인
update public.profiles set is_admin = true, subscribed = true where id = '내-uuid';
```
- `is_admin = true` → 앱에 **관리자** 탭이 생기고 참가자 전체를 열람.
- `subscribed = true` → 이번 주·흐름 잠금 해제. 파일럿에서 참가자에게 열어주려면 그 사람 행의 `subscribed`를 true로.

## 5. 배포 (Vercel 예시)
1. 이 폴더를 GitHub 저장소로 push (`.env`는 `.gitignore`로 제외됨).
2. Vercel → New Project → 저장소 선택 (Framework: **Vite** 자동 감지).
3. **Environment Variables** 에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가.
4. Deploy. (Netlify도 동일 — build command `npm run build`, publish dir `dist`.)
5. 배포된 주소를 슬랙(HOC) 참가자에게 공유하면 끝.

> `anon key`는 브라우저에 공개돼도 되는 키입니다. 실제 접근 통제는 **RLS(Row Level Security)** 가 합니다.
> 참가자는 자기 데이터만 읽고 쓰며, `is_admin`인 계정만 전체를 읽습니다.

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
    Auth.jsx            가입 없이 시작 / 로그인
    WaveGauge.jsx       몰아침 물결 게이지(canvas)
    AppShell.jsx        인사말 + 매일 랜덤 문구 + 탭 + 잠금 + 전환 모달
  pages/
    DayPage / MonthPage / WeekPage / ChartPage / GuidePage / LockedPage / AdminPage
supabase/schema.sql     테이블 + RLS + is_admin()
```

## 온보딩·과금 모델
1. **가입 없이 시작** — 닉네임만. Supabase 익명 로그인으로 서버에 익명 계정 생성.
2. **가입해서 지키기** — 앱 안 "가입하고 기록 지키기" → 이메일/비번을 같은 계정에 연결(`updateUser`). 기록 그대로 유지, 다른 기기에서도 로그인.
3. **구독** — 무료는 오늘·이번 달. 돌아보기(이번 주·흐름)는 `subscribed`가 true여야 열림.

## 결제 연동 (다음 단계)
지금은 `LockedPage`의 "구독하기" 버튼이 자리만 잡고 있습니다. 실제 결제는 나중에:
- **Toss Payments**(국내 정기결제) 또는 **Stripe Billing** 연동.
- 결제 성공 웹훅 → `profiles.subscribed = true` 로 갱신 (Supabase Edge Function 권장).
- 버튼 `onClick`을 결제 위젯 호출로 교체하면 됩니다.

## 참고 / 주의
- 하루 기록은 `entries` 테이블에 (user_id, date) 한 행. 설정(약속·예보)은 `settings` 한 행.
- 관리자 상세 분석은 **관리자 탭 → CSV 내려받기** 또는 Supabase 대시보드에서.
- `profiles.is_admin` / `subscribed` 를 참가자가 스스로 못 바꾸게 하려면, 운영 단계에서 컬럼 권한(REVOKE)이나 트리거로 잠그세요(현재 RLS는 본인 행 update를 허용).

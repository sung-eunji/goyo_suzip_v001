import { useEffect, useMemo, useState } from 'react';
import * as store from '../lib/store';
import { MSGS, iso } from '../lib/data';
import DayPage from '../pages/DayPage';
import MonthPage from '../pages/MonthPage';
import WeekPage from '../pages/WeekPage';
import ChartPage from '../pages/ChartPage';
import GuidePage from '../pages/GuidePage';
import LockedPage from '../pages/LockedPage';
import AdminPage from '../pages/AdminPage';

const EMAILRE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FREE = new Set(['day', 'month', 'guide']);

function dailyMessage(userId) {
  const today = iso(new Date());
  const key = 'goyo.msg.' + userId;
  let idx = Math.floor(Math.random() * MSGS.length);
  try {
    const o = JSON.parse(localStorage.getItem(key) || 'null');
    if (o && o.date === today && typeof o.idx === 'number') idx = o.idx;
    else localStorage.setItem(key, JSON.stringify({ date: today, idx }));
  } catch {}
  return MSGS[idx];
}

export default function AppShell({
  profile,
  journal,
  onLogout,
  onConverted,
  api,
}) {
  const today = useMemo(() => new Date(), []);
  const [tab, setTab] = useState('guide');
  const [isAnon, setIsAnon] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const msg = useMemo(() => dailyMessage(profile.id), [profile.id]);

  useEffect(() => {
    store.getUser().then((u) => setIsAnon(!!u && !u.email));
  }, []);

  const subscribed = !!profile.subscribed;
  const tabs = [
    { k: 'guide', label: '안내', sub: '쓰는 법' },
    { k: 'day', label: '오늘', sub: '일 · 2분' },
    { k: 'month', label: '이번 달', sub: '월 · 물때' },
    { k: 'week', label: '이번 주', sub: '주 · 파도' },
    { k: 'chart', label: '흐름', sub: '차트' },
  ];
  if (profile.role === 'admin')
    tabs.push({ k: 'admin', label: '관리자', sub: '전체' });

  const locked = !FREE.has(tab) && tab !== 'admin' && !subscribed;

  return (
    <div className="wrap" style={{ paddingTop: 0 }}>
      <div className="userbar">
        <div className="greet">
          <b>{profile.nickname}</b>님, 반가워요
        </div>
        {isAnon && (
          <button className="convertbtn" onClick={() => setConvertOpen(true)}>
            가입하고 기록 지키기
          </button>
        )}
        <button
          className="logoutbtn"
          style={isAnon ? { marginLeft: 0 } : undefined}
          onClick={onLogout}
        >
          로그아웃
        </button>
        <p className="dailymsg serif">{msg}</p>
        {isAnon && (
          <p className="authnote device-note">
            이 브라우저의 익명 기록이에요. 다른 기기에서도 이어보려면 이메일을
            연결해주세요.
          </p>
        )}
      </div>

      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.k}
            role="tab"
            aria-selected={tab === t.k}
            onClick={() => setTab(t.k)}
          >
            <span>{t.label}</span>
            <span className="k">
              {t.sub}
              {!FREE.has(t.k) && t.k !== 'admin' && !subscribed ? ' · 🔒' : ''}
            </span>
          </button>
        ))}
      </nav>

      {locked ? (
        <LockedPage tab={tab} />
      ) : (
        <>
          {tab === 'day' && (
            <DayPage journal={journal} api={api} today={today} />
          )}
          {tab === 'month' && (
            <MonthPage journal={journal} api={api} today={today} />
          )}
          {tab === 'week' && <WeekPage journal={journal} today={today} />}
          {tab === 'chart' && <ChartPage journal={journal} today={today} />}
          {tab === 'guide' && <GuidePage api={api} />}
          {tab === 'admin' && profile.role === 'admin' && <AdminPage />}
        </>
      )}

      <div className="footnote">
        <b>고요수집 · Collecting Stillness</b> — 무엇을 했는지가 아니라, 몸이
        어떻게 답했는지를 모읍니다.
        <br />
        오늘·이번 달은 무료예요. 돌아보기(이번 주·흐름·전체 히스토리)는 구독하면
        열려요.
      </div>

      {convertOpen && (
        <ConvertModal
          onClose={() => setConvertOpen(false)}
          onDone={async () => {
            setConvertOpen(false);
            setIsAnon(false);
            await onConverted();
          }}
        />
      )}
    </div>
  );
}

function ConvertModal({ onClose, onDone }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!EMAILRE.test(email)) {
      setErr('이메일 형식을 확인해주세요.');
      return;
    }
    if (!pw || pw.length < 6) {
      setErr('비밀번호는 6자 이상이에요.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await store.convertToAccount(email.trim().toLowerCase(), pw);
      await onDone();
    } catch (e) {
      setErr(e.message || '이미 쓰이는 이메일이거나 문제가 있어요.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="modal"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modalcard">
        {err && <div className="autherr">{err}</div>}
        <h3 className="serif">기록을 지켜요</h3>
        <p>
          이메일과 비밀번호를 더하면, 다음에 어느 기기에서든 이 기록을 다시 볼
          수 있어요. 지금까지 쓴 기록은 그대로 유지돼요.
        </p>
        <div className="fld">
          <label>이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="fld">
          <label>
            비밀번호{' '}
            <span className="muted" style={{ fontWeight: 400 }}>
              · 6자 이상
            </span>
          </label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="비밀번호"
          />
        </div>
        <div className="modalrow">
          <button
            className="authbtn"
            style={{ flex: 1 }}
            disabled={busy}
            onClick={go}
          >
            {busy ? '잠시만요…' : '가입하고 지키기'}
          </button>
          <button className="btn ghost" onClick={onClose}>
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}

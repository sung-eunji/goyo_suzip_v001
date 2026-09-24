import { useState } from 'react';
import * as store from '../lib/store';

const EMAILRE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Auth({ onEntered }) {
  const [view, setView] = useState('start'); // start | login
  const [nick, setNick] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!nick.trim()) {
      setErr('닉네임을 입력해주세요.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await store.startAnon(nick.trim(), remember);
      await onEntered();
    } catch (e) {
      setErr(
        e.code === '23505' || e.message?.includes('profiles_nickname_key')
          ? '이미 사용 중인 닉네임이에요. 같은 사람이라면 로그인하거나, 다른 닉네임을 사용해주세요.'
          : e.message === 'Anonymous sign-ins are disabled'
            ? 'Supabase에서 익명 로그인이 꺼져 있어요. 관리자에게 Anonymous sign-ins를 켜달라고 요청해주세요.'
            : e.message || '문제가 생겼어요. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function login() {
    if (!EMAILRE.test(email)) {
      setErr('이메일 형식을 확인해주세요.');
      return;
    }
    if (!pw) {
      setErr('비밀번호를 입력해주세요.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await store.login(email.trim().toLowerCase(), pw, remember);
      await onEntered();
    } catch {
      setErr('이메일 또는 비밀번호가 맞지 않아요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authwrap">
      <div className="authhero">
        <div className="lg">고요수집</div>
        <div className="en">Collecting Stillness</div>
      </div>
      <div className="authcard">
        {err && <div className="autherr">{err}</div>}

        {view === 'start' ? (
          <div>
            <div className="fld">
              <label>닉네임</label>
              <input
                type="text"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && start()}
                placeholder="고요수집에서 불릴 이름"
                autoComplete="nickname"
              />
            </div>
            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              로그인 유지 · 이 기기에서 정보 기억하기
            </label>
            <button className="authbtn" disabled={busy} onClick={start}>
              {busy ? '잠시만요…' : '시작하기'}
            </button>

            <p className="authnote">
              다른 브라우저나 기기에서도 이어보려면, 먼저 시작한 뒤 대시보드에서
              <b> 가입하고 기록 지키기</b>를 눌러 이메일을 연결해주세요.
            </p>

            <p className="switchline">
              다른 브라우저에서 기록 이어보기 ·{' '}
              <button
                className="linkbtn"
                onClick={() => {
                  setErr('');
                  setView('login');
                }}
              >
                로그인하기
              </button>
            </p>
          </div>
        ) : (
          <div>
            <div className="fld">
              <label>이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="fld">
              <label>비밀번호</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                placeholder="비밀번호"
                autoComplete="current-password"
              />
            </div>
            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              로그인 유지 · 이 기기에서 정보 기억하기
            </label>
            <button className="authbtn" disabled={busy} onClick={login}>
              {busy ? '잠시만요…' : '로그인'}
            </button>
            <p className="switchline">
              <button
                className="linkbtn"
                onClick={() => {
                  setErr('');
                  setView('start');
                }}
              >
                ← 가입 없이 시작하기
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

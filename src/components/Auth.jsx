import { useState } from 'react'
import * as store from '../lib/store'

const EMAILRE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function Auth({ onEntered }) {
  const [view, setView] = useState('start') // start | login
  const [nick, setNick] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function start() {
    if (!nick.trim()) { setErr('닉네임을 입력해주세요.'); return }
    setBusy(true); setErr('')
    try { await store.startAnon(nick.trim(), remember); await onEntered() }
    catch (e) { setErr(e.message || '문제가 생겼어요. 잠시 후 다시 시도해주세요.') }
    finally { setBusy(false) }
  }
  async function login() {
    if (!EMAILRE.test(email)) { setErr('이메일 형식을 확인해주세요.'); return }
    if (!pw) { setErr('비밀번호를 입력해주세요.'); return }
    setBusy(true); setErr('')
    try { await store.login(email.trim().toLowerCase(), pw, remember); await onEntered() }
    catch { setErr('이메일 또는 비밀번호가 맞지 않아요.') }
    finally { setBusy(false) }
  }

  return (
    <div className="authwrap">
      <div className="authhero"><div className="lg">고요수집</div><div className="en">Collecting Stillness</div></div>
      <div className="authcard">
        {err && <div className="autherr">{err}</div>}

        {view === 'start' ? (
          <div>
            <p className="startlead">가입 없이 바로 시작해요.<br />닉네임만 있으면 오늘의 고요를 기록할 수 있어요.</p>
            <div className="fld">
              <label>닉네임</label>
              <input type="text" value={nick} onChange={(e) => setNick(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && start()}
                placeholder="고요수집에서 불릴 이름" autoComplete="nickname" />
            </div>
            <label className="remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />로그인 유지 · 이 기기에서 정보 기억하기</label>
            <button className="authbtn" disabled={busy} onClick={start}>{busy ? '잠시만요…' : '시작하기'}</button>
            <p className="authnote">기록은 안전하게 서버에 저장돼요. 다음에 또 보고 싶으면 언제든 가입해서 어느 기기에서든 이어볼 수 있어요.</p>
            <p className="switchline">이미 가입했나요? <button className="linkbtn" onClick={() => { setErr(''); setView('login') }}>로그인</button></p>
          </div>
        ) : (
          <div>
            <div className="fld"><label>이메일</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()} placeholder="you@example.com" autoComplete="email" /></div>
            <div className="fld"><label>비밀번호</label>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()} placeholder="비밀번호" autoComplete="current-password" /></div>
            <label className="remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />로그인 유지 · 이 기기에서 정보 기억하기</label>
            <button className="authbtn" disabled={busy} onClick={login}>{busy ? '잠시만요…' : '로그인'}</button>
            <p className="switchline"><button className="linkbtn" onClick={() => { setErr(''); setView('start') }}>← 가입 없이 시작하기</button></p>
          </div>
        )}
      </div>
    </div>
  )
}

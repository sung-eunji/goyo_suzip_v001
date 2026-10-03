import { useState } from 'react';
import * as store from '../lib/store';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;
const GENDERS = [
  ['man', '남성'],
  ['woman', '여성'],
  ['prefer_not_to_say', '응답 안 함'],
];

export default function Auth({ onEntered }) {
  const [view, setView] = useState('welcome');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function switchView(nextView) {
    setError('');
    setView(nextView);
  }

  async function register(event) {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim()))
      return setError('이메일 형식을 확인해주세요.');
    if (!gender) return setError('성별 항목을 선택해주세요.');
    if (!nickname.trim()) return setError('닉네임을 입력해주세요.');
    if (!PASSWORD_RE.test(password)) {
      return setError(
        '비밀번호는 8자 이상이며 대문자, 소문자, 숫자, 특수문자를 각각 포함해야 해요.',
      );
    }
    if (password !== passwordConfirm)
      return setError('비밀번호가 서로 일치하지 않아요.');

    setBusy(true);
    setError('');
    try {
      const result = await store.registerAccount({
        email,
        password,
        nickname,
        gender,
        remember,
      });
      if (result.user && !result.user.identities?.length) {
        setError('이미 가입된 이메일이에요. 로그인해주세요.');
        setView('login');
      } else if (result.session) {
        await onEntered();
      } else {
        setView('confirmation');
      }
    } catch (e) {
      setError(
        e.code === 'NICKNAME_TAKEN' || e.code === '23505'
          ? '이미 사용 중인 닉네임이에요. 다른 닉네임을 선택해주세요.'
          : e.message ||
              '회원가입을 완료하지 못했어요. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim()))
      return setError('이메일 형식을 확인해주세요.');
    if (!password) return setError('비밀번호를 입력해주세요.');
    setBusy(true);
    setError('');
    try {
      await store.login(email.trim().toLowerCase(), password, remember);
      await onEntered();
    } catch {
      setError('이메일 또는 비밀번호가 맞지 않아요.');
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
        {error && (
          <div className="autherr" role="alert">
            {error}
          </div>
        )}

        {view === 'welcome' && (
          <div>
            <p className="startlead">고요수집 입장하기</p>
            <button className="authbtn" onClick={() => switchView('register')}>
              회원가입
            </button>
            <button
              className="authbtn"
              style={{ marginTop: 10 }}
              onClick={() => switchView('login')}
            >
              로그인
            </button>
          </div>
        )}

        {view === 'register' && (
          <form onSubmit={register}>
            <h2 className="serif" style={{ fontSize: 20, margin: '0 0 16px' }}>
              회원가입
            </h2>
            <div className="fld">
              <label htmlFor="register-email">이메일</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <fieldset className="fld gender-field">
              <legend>성별</legend>
              <div className="gender-options">
                {GENDERS.map(([value, label]) => (
                  <label
                    key={value}
                    className={gender === value ? 'selected' : ''}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={value}
                      checked={gender === value}
                      onChange={(e) => setGender(e.target.value)}
                      required
                    />
                    <span className="radio-mark" aria-hidden="true" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="fld">
              <label htmlFor="register-nickname">닉네임</label>
              <input
                id="register-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoComplete="nickname"
                required
              />
            </div>
            <div className="fld">
              <label htmlFor="register-password">
                비밀번호{' '}
                <span className="muted">
                  · 8자+, 대문자·소문자·숫자·특수문자
                </span>
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="fld">
              <label htmlFor="register-password-confirm">비밀번호 확인</label>
              <input
                id="register-password-confirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                required
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
            <button className="authbtn" type="submit" disabled={busy}>
              {busy ? '가입 중…' : '회원가입'}
            </button>
            <p className="switchline">
              <button
                type="button"
                className="linkbtn"
                onClick={() => switchView('welcome')}
              >
                ← 입장 화면
              </button>
            </p>
          </form>
        )}

        {view === 'login' && (
          <form onSubmit={login}>
            <h2 className="serif" style={{ fontSize: 20, margin: '0 0 16px' }}>
              로그인
            </h2>
            <div className="fld">
              <label htmlFor="login-email">이메일</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="fld">
              <label htmlFor="login-password">비밀번호</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
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
            <button className="authbtn" type="submit" disabled={busy}>
              {busy ? '로그인 중…' : '로그인'}
            </button>
            <p className="switchline">
              <button
                type="button"
                className="linkbtn"
                onClick={() => switchView('register')}
              >
                회원가입
              </button>{' '}
              ·{' '}
              <button
                type="button"
                className="linkbtn"
                onClick={() => switchView('welcome')}
              >
                입장 화면
              </button>
            </p>
          </form>
        )}

        {view === 'confirmation' && (
          <div>
            <h2 className="serif" style={{ fontSize: 20 }}>
              이메일을 확인해주세요
            </h2>
            <p className="lead">
              가입 확인 메일을 보냈어요. 이메일 인증을 마친 다음 로그인해주세요.
            </p>
            <button className="authbtn" onClick={() => switchView('login')}>
              로그인으로 이동
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

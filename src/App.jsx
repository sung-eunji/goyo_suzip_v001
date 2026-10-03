import { useEffect, useState, useCallback, useRef } from 'react';
import { isConfigured } from './supabaseClient';
import * as store from './lib/store';
import { scoreFromEvents } from './lib/data';
import Auth from './components/Auth';
import AppShell from './components/AppShell';

function Header() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('goyo.theme') || '';
    } catch {
      return '';
    }
  });
  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  }, [theme]);
  const toggle = () => {
    const cur =
      theme ||
      (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('goyo.theme', next);
    } catch {}
  };
  return (
    <header className="top">
      <span className="logo">고요수집</span>
      <span className="en">Collecting Stillness</span>
      <span className="tag">정중동 · 靜中動</span>
      <button
        className="themebtn"
        onClick={toggle}
        title="테마"
        aria-label="밝게/어둡게 전환"
      >
        ◐
      </button>
    </header>
  );
}

function Setup() {
  return (
    <div className="authwrap">
      <div className="authhero">
        <div className="lg">고요수집</div>
        <div className="en">Collecting Stillness</div>
      </div>
      <div className="authcard">
        <h2 className="serif" style={{ fontSize: 20, margin: '0 0 8px' }}>
          Supabase 설정이 필요해요
        </h2>
        <p className="lead" style={{ fontSize: 14 }}>
          <code>.env.example</code>을 <code>.env</code>로 복사하고 Supabase
          프로젝트의 <b>URL</b>과 <b>anon key</b>를 채운 뒤
          <code> npm run dev</code>를 다시 실행하세요. 자세한 절차는{' '}
          <b>README.md</b>에 있어요.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState('loading'); // loading | setup | auth | app
  const [profile, setProfile] = useState(null);
  const [journal, setJournal] = useState({
    promises: [],
    forecast: {},
    forecastEvents: {},
    eventTypes: [],
    entries: {},
  });
  const journalRef = useRef(journal);
  useEffect(() => {
    journalRef.current = journal;
  }, [journal]);

  const enter = useCallback(async () => {
    const prof = await store.loadProfile();
    if (!prof) {
      setPhase('auth');
      return;
    }
    const j = await store.fetchJournal(prof.id);
    setProfile(prof);
    setJournal(j);
    setPhase('app');
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setPhase('setup');
      return;
    }
    if (
      new URLSearchParams(window.location.search).get('auth') === 'recovery'
    ) {
      setPhase('auth');
      return;
    }
    let mounted = true;
    (async () => {
      const user = await store.getUser();
      if (!mounted) return;
      if (user) await enter();
      else setPhase('auth');
    })();
    const { data: sub } = store.onAuthChange((user) => {
      if (!user) {
        setProfile(null);
        setPhase('auth');
      }
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [enter]);

  const saveDayEntry = useCallback(
    async (date, entry) => {
      setJournal((j) => ({ ...j, entries: { ...j.entries, [date]: entry } }));
      if (profile) await store.saveEntry(profile.id, date, entry);
    },
    [profile],
  );

  const clearDayEntry = useCallback(
    async (date) => {
      setJournal((j) => {
        const e = { ...j.entries };
        delete e[date];
        return { ...j, entries: e };
      });
      if (profile) await store.deleteEntry(profile.id, date);
    },
    [profile],
  );

  const setPromises = useCallback(
    async (promises) => {
      setJournal((j) => ({ ...j, promises }));
      if (profile)
        await store.saveSettings(
          profile.id,
          promises,
          journalRef.current.forecastEvents,
        );
    },
    [profile],
  );

  const setForecastEvents = useCallback(
    async (forecastEvents) => {
      const score = Object.fromEntries(
        Object.entries(forecastEvents).map(([date, types]) => [
          date,
          scoreFromEvents(types, journalRef.current.eventTypes),
        ]),
      );
      setJournal((j) => ({ ...j, forecastEvents, forecast: score }));
      if (profile)
        await store.saveSettings(
          profile.id,
          journalRef.current.promises,
          forecastEvents,
        );
    },
    [profile],
  );

  const doLogout = useCallback(async () => {
    await store.logout();
  }, []);
  const refreshProfile = useCallback(async () => {
    setProfile(await store.loadProfile());
  }, []);

  if (phase === 'setup')
    return (
      <>
        <Header />
        <Setup />
      </>
    );
  if (phase === 'loading')
    return (
      <>
        <Header />
        <div className="authwrap">
          <p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>
            불러오는 중…
          </p>
        </div>
      </>
    );
  if (phase === 'auth')
    return (
      <>
        <Header />
        <Auth
          onEntered={enter}
          initialView={
            new URLSearchParams(window.location.search).get('auth') ===
            'recovery'
              ? 'recovery'
              : 'welcome'
          }
        />
      </>
    );

  return (
    <>
      <Header />
      <AppShell
        profile={profile}
        journal={journal}
        onLogout={doLogout}
        onConverted={refreshProfile}
        api={{
          saveDayEntry,
          clearDayEntry,
          setPromises,
          setForecastEvents,
        }}
      />
    </>
  );
}

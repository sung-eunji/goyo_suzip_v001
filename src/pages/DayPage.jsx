import { useEffect, useState } from 'react';
import { iso, DOW, BODY, MET_FEEL, NEEDS, SOLUTION_SCORES } from '../lib/data';
import WaveGauge from '../components/WaveGauge';
import ChallengeAudioCard from '../components/ChallengeAudioCard';

const dotClass = { tense: 'd-tense', flow: 'd-flow', ease: 'd-ease' };
const colClass = { tense: 'col-tense', flow: 'col-flow', ease: 'col-ease' };
const DEV_DATE = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('challengeDate')
  : null;
const DEV_CHALLENGE_PREVIEW =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('challengePreview') === '1';
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;
const OCTOBER_START = '2026-10-01';
const OCTOBER_END = '2026-10-31';
const INITIAL_CHALLENGE_DATE =
  DEV_DATE && VALID_DATE.test(DEV_DATE)
    ? DEV_DATE
    : DEV_CHALLENGE_PREVIEW
      ? '2026-10-13'
      : null;

function octoberDate(dateKey) {
  const boundedDate =
    dateKey < OCTOBER_START
      ? OCTOBER_START
      : dateKey > OCTOBER_END
        ? OCTOBER_END
        : dateKey;
  return new Date(`${boundedDate}T12:00:00`);
}

export default function DayPage({ journal, api, today }) {
  const [curDay, setCurDay] = useState(() =>
    INITIAL_CHALLENGE_DATE
      ? new Date(`${INITIAL_CHALLENGE_DATE}T12:00:00`)
      : octoberDate(iso(today)),
  );
  const key = iso(curDay);
  const entry = journal.entries[key];

  const [surge, setSurge] = useState(30);
  const [dayNote, setDayNote] = useState('');
  const [kept, setKept] = useState([]);
  const [moment, setMoment] = useState('');
  const [min, setMin] = useState('');
  const [feel, setFeel] = useState([]);
  const [body, setBody] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [desiredCalm, setDesiredCalm] = useState('');
  const [solutionScore, setSolutionScore] = useState('');
  const [none, setNone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [challengeWindow, setChallengeWindow] = useState(undefined);

  useEffect(() => {
    const e = journal.entries[key] || {
      surge: 30,
      dayNote: '',
      kept: [],
      met: null,
      body: [],
      none: false,
    };
    setSurge(e.surge);
    setDayNote(e.dayNote || '');
    setKept(e.kept || []);
    setMoment(e.met?.moment || '');
    setMin(e.met?.min || '');
    setFeel(e.met?.feel || []);
    setBody(e.body || []);
    setNeeds(e.observation?.needs || []);
    setDesiredCalm(e.observation?.desiredCalm || '');
    setSolutionScore(
      e.observation?.solutionScore ? String(e.observation.solutionScore) : '',
    );
    setNone(!!e.none);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, entry]);

  const currentDateKey = challengeWindow?.serverDate || iso(today);
  const todayInChallengeMonth = octoberDate(currentDateKey);
  const todayKey = iso(todayInChallengeMonth);
  const isToday = key === todayKey;
  const daysAgo = Math.round(
    (Date.parse(`${currentDateKey}T00:00:00Z`) -
      Date.parse(`${key}T00:00:00Z`)) /
      86400000,
  );
  // 3일이 지나면 더 이상 손댈 수 없어요 — 늦게 채운 기록이 이탈·급증일 분석을 왜곡하지 않도록.
  const challengeDateInWindow =
    challengeWindow !== undefined &&
    (!challengeWindow ||
      (key >= challengeWindow.startDate && key <= challengeWindow.endDate));
  const challengeDateAllowed =
    challengeDateInWindow &&
    (!challengeWindow || key <= challengeWindow.serverDate);
  const editable = daysAgo >= 0 && daysAgo <= 3 && challengeDateAllowed;
  const shift = (n) => {
    const d = new Date(curDay);
    d.setDate(d.getDate() + n);
    const nextKey = iso(d);
    if (nextKey < OCTOBER_START || nextKey > OCTOBER_END) return;
    setCurDay(d);
  };
  const toggle = (arr, set, v) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function save() {
    if (!editable) return;
    const met =
      moment.trim() || min || feel.length
        ? { moment: moment.trim(), min: +min || 0, feel }
        : null;
    const e = {
      surge,
      dayNote,
      kept: none ? [] : kept,
      met: none ? null : met,
      body: none ? [] : body,
      none,
      observation: {
        needs: none ? [] : needs,
        desiredCalm: none ? '' : desiredCalm.trim(),
        solutionScore: none ? null : +solutionScore || null,
      },
    };
    await api.saveDayEntry(key, e);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <section className="page on">
      <div className="datebar">
        <button
          className="nav"
          onClick={() => shift(-1)}
          disabled={key <= OCTOBER_START}
          aria-label="이전 날"
        >
          ‹
        </button>
        <span className="dlabel">
          {curDay.getMonth() + 1}월 {curDay.getDate()}일 ({DOW[curDay.getDay()]}
          )
        </span>
        <button
          className="nav"
          onClick={() => shift(1)}
          disabled={key >= OCTOBER_END}
          aria-label="다음 날"
        >
          ›
        </button>
        {!isToday && (
          <button
            className="today"
            onClick={() => setCurDay(todayInChallengeMonth)}
          >
            오늘로
          </button>
        )}
      </div>

      <ChallengeAudioCard
        dateKey={key}
        onChallengeWindow={setChallengeWindow}
      />

      {challengeWindow === undefined ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="muted" style={{ margin: 0 }}>
            기록 가능한 날짜를 확인하고 있어요.
          </p>
        </div>
      ) : challengeWindow && !challengeDateInWindow ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="muted" style={{ margin: 0 }}>
            챌린지 기록은 {Number(challengeWindow.startDate.slice(5, 7))}월{' '}
            {Number(challengeWindow.startDate.slice(8, 10))}일부터{' '}
            {Number(challengeWindow.endDate.slice(5, 7))}월{' '}
            {Number(challengeWindow.endDate.slice(8, 10))}일까지 입력할 수
            있어요.
          </p>
        </div>
      ) : daysAgo < 0 ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="muted" style={{ margin: 0 }}>
            {Number(key.slice(5, 7))}월 {Number(key.slice(8, 10))}일이 되면
            기록할 수 있어요.
          </p>
        </div>
      ) : !editable ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="muted" style={{ margin: 0 }}>
            3일이 지난 날은 더 이상 기록할 수 없어요. 이 날은 "기록 없음"으로
            처리돼요 — 늦게 채운 기록이 흐름을 흐트러뜨리지 않도록 정한
            규칙이에요.
          </p>
        </div>
      ) : null}

      <div
        className="card"
        style={editable ? undefined : { opacity: 0.55, pointerEvents: 'none' }}
      >
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          ① 몰아침 게이지
        </div>
        <WaveGauge value={surge} onChange={setSurge} />
        <div className="metgrid" style={{ marginTop: 10 }}>
          <input
            type="text"
            value={dayNote}
            onChange={(e) => setDayNote(e.target.value)}
            placeholder="오늘 몰아침, 무슨 일이었나요 (선택)"
          />
        </div>

        <div className={'field' + (none ? ' dimmed' : '')}>
          <div className="flabel">
            <span className="n">②</span>
            <h3>들인 고요</h3>
            <span className="hint">이번 달 약속한 고요를 오늘 들였나요</span>
          </div>
          <div>
            {journal.promises.length === 0 && (
              <div className="promise empty">
                이번 달 탭에서 고요 약속을 먼저 정해보세요
              </div>
            )}
            {journal.promises.map((p, i) => (
              <label
                key={i}
                className={'promise' + (kept.includes(i) ? ' done' : '')}
              >
                <input
                  type="checkbox"
                  checked={kept.includes(i)}
                  onChange={() => toggle(kept, setKept, i)}
                />
                <span className="txt">{p}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={'field' + (none ? ' dimmed' : '')}>
          <div className="flabel">
            <span className="n">③</span>
            <h3>뜻밖에 찾아온 고요</h3>
            <span className="hint">뜻밖의 고요가 있었다면 적어주세요</span>
          </div>
          <div className="metgrid">
            <input
              type="text"
              value={moment}
              onChange={(e) => setMoment(e.target.value)}
              placeholder="예: 커피를 마시며 창밖을 본 순간"
            />
            <div className="minwrap">
              <input
                type="number"
                min="0"
                max="600"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="0"
              />
              <span>분</span>
            </div>
          </div>
          <div className="feelwrap">
            <span className="feellabel">
              그때 몸은 어떻게 답했나요?{' '}
              <span className="muted" style={{ fontWeight: 400 }}>
                · 느낌이 있었다면 골라주세요
              </span>
            </span>
            <div className="chips col-flow">
              {MET_FEEL.map((it) => (
                <button
                  key={it}
                  type="button"
                  className={'chip' + (feel.includes(it) ? ' sel' : '')}
                  onClick={() => toggle(feel, setFeel, it)}
                >
                  {it}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={'field' + (none ? ' dimmed' : '')}>
          <div className="flabel">
            <span className="n">④</span>
            <h3>몸 감각</h3>
            <span className="hint">지금 몸의 세 결</span>
          </div>
          <div className="bodycols">
            {Object.entries(BODY).map(([k, cat]) => (
              <div key={k} className={'bodycol ' + colClass[k]}>
                <h4>
                  <span className={'dot ' + dotClass[k]}></span>
                  {cat.label}
                </h4>
                <div className="desc">{cat.sub}</div>
                <div className="chips">
                  {cat.items.map((it) => (
                    <button
                      key={it}
                      type="button"
                      className={'chip' + (body.includes(it) ? ' sel' : '')}
                      onClick={() => toggle(body, setBody, it)}
                    >
                      {it}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={'field' + (none ? ' dimmed' : '')}>
          <div className="flabel">
            <span className="n">⑤</span>
            <h3>오늘 필요한 변화</h3>
            <span className="hint">지금 가장 가까운 것을 골라주세요</span>
          </div>
          <div className="chips col-flow">
            {NEEDS.map((item) => (
              <button
                key={item}
                type="button"
                className={'chip' + (needs.includes(item) ? ' sel' : '')}
                onClick={() => toggle(needs, setNeeds, item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="metgrid" style={{ marginTop: 12 }}>
            <input
              type="text"
              value={desiredCalm}
              onChange={(e) => setDesiredCalm(e.target.value)}
              placeholder="고요가 무엇을 도와주면 좋을까요"
            />
            <select
              value={solutionScore}
              onChange={(e) => setSolutionScore(e.target.value)}
              aria-label="해결감"
            >
              <option value="">해결감</option>
              {SOLUTION_SCORES.map((label, i) => (
                <option key={label} value={i + 1}>
                  {i + 1} · {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className={'nostill' + (none ? ' on' : '')}>
          <input
            type="checkbox"
            checked={none}
            onChange={(e) => setNone(e.target.checked)}
          />
          <span className="txt">
            <strong>오늘은 고요가 없었어요</strong>
            <small>
              실패가 아니라 정식 기록입니다. 없었던 날도 물결의 일부예요.
            </small>
          </span>
        </label>

        <div className="savebar">
          <button className="btn" onClick={save}>
            기록 저장
          </button>
          {saved && <span className="saved">✓ 저장됨</span>}
          <button
            className="btn clear-day-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => api.clearDayEntry(key)}
          >
            이 날 비우기
          </button>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { iso, DOW, BODY, MET_FEEL, NEEDS, SOLUTION_SCORES } from '../lib/data';
import WaveGauge from '../components/WaveGauge';

const dotClass = { tense: 'd-tense', flow: 'd-flow', ease: 'd-ease' };
const colClass = { tense: 'col-tense', flow: 'col-flow', ease: 'col-ease' };

export default function DayPage({ journal, api, today }) {
  const [curDay, setCurDay] = useState(() => new Date(today));
  const key = iso(curDay);
  const entry = journal.entries[key];

  const [surge, setSurge] = useState(30);
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

  useEffect(() => {
    const e = journal.entries[key] || {
      surge: 30,
      kept: [],
      met: null,
      body: [],
      none: false,
    };
    setSurge(e.surge);
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

  const isToday = iso(curDay) === iso(today);
  const shift = (n) => {
    const d = new Date(curDay);
    d.setDate(d.getDate() + n);
    setCurDay(d);
  };
  const toggle = (arr, set, v) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function save() {
    const met =
      moment.trim() || min || feel.length
        ? { moment: moment.trim(), min: +min || 0, feel }
        : null;
    const e = {
      surge,
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
        <button className="nav" onClick={() => shift(-1)} aria-label="이전 날">
          ‹
        </button>
        <span className="dlabel">
          {curDay.getMonth() + 1}월 {curDay.getDate()}일 ({DOW[curDay.getDay()]}
          )
        </span>
        <button
          className="nav"
          onClick={() => shift(1)}
          disabled={isToday}
          aria-label="다음 날"
        >
          ›
        </button>
        {!isToday && (
          <button className="today" onClick={() => setCurDay(new Date(today))}>
            오늘로
          </button>
        )}
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          ① 몰아침 게이지
        </div>
        <WaveGauge value={surge} onChange={setNone ? setSurge : setSurge} />

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
            <h3>찾아온 고요</h3>
            <span className="hint">계획에 없던, 뜻밖에 스며든 고요</span>
          </div>
          <div className="metgrid">
            <input
              type="text"
              value={moment}
              onChange={(e) => setMoment(e.target.value)}
              placeholder="어떤 순간이었나요 — 예: 커피 내리며 창밖 보기"
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
              그때 몸은 어떻게 답했나요{' '}
              <span className="muted" style={{ fontWeight: 400 }}>
                · 골라주세요
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
            className="btn ghost"
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

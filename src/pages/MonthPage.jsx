import { useEffect, useState } from 'react';
import { pad, iso, DOW } from '../lib/data';

const DEFAULT_EVENT_TYPES = [
  { key: 'deadline', label_ko: '마감', sort_order: 10 },
  { key: 'trip', label_ko: '출장', sort_order: 20 },
  { key: 'kids', label_ko: '아이 일정', sort_order: 30 },
  { key: 'other', label_ko: '기타', sort_order: 40 },
];

const LEVELS = [
  { value: 0, label: '낮음' },
  { value: 1, label: '중약' },
  { value: 2, label: '중간' },
  { value: 3, label: '중강' },
  { value: 4, label: '높음' },
];

function levelFromJournal(journal, date) {
  if (journal.forecastLevels?.[date] !== undefined)
    return journal.forecastLevels[date];
  return Math.max(
    0,
    Math.min(4, Math.round((journal.forecast?.[date] || 0) / 25)),
  );
}

export default function MonthPage({ journal, api, today }) {
  const [monthView, setMonthView] = useState({
    y: today.getFullYear(),
    m: today.getMonth(),
  });
  const [promises, setPromises] = useState(journal.promises);
  const [editingKey, setEditingKey] = useState(null);
  const [otherDraft, setOtherDraft] = useState('');
  useEffect(() => setPromises(journal.promises), [journal.promises]);

  const { y, m } = monthView;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const todayKey = iso(today);
  const eventTypes = journal.eventTypes?.length
    ? journal.eventTypes
    : DEFAULT_EVENT_TYPES;
  const selectedEvents = journal.forecastEvents?.[editingKey] || [];
  const selectedLevel = editingKey ? levelFromJournal(journal, editingKey) : 0;
  const otherNote = editingKey
    ? journal.forecastEventNotes?.[editingKey]?.other || ''
    : '';
  useEffect(() => setOtherDraft(otherNote), [editingKey, otherNote]);
  const labelOf = (key) =>
    eventTypes.find((type) => type.key === key)?.label_ko || key;

  const stepMonth = (step) => {
    let nextMonth = m + step;
    let nextYear = y;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setMonthView({ y: nextYear, m: nextMonth });
    setEditingKey(null);
  };

  const toggleEvent = (date, typeKey) => {
    const currentTypes = journal.forecastEvents?.[date] || [];
    const nextTypes = currentTypes.includes(typeKey)
      ? currentTypes.filter((type) => type !== typeKey)
      : [...currentTypes, typeKey];
    const forecastEvents = { ...(journal.forecastEvents || {}) };
    if (nextTypes.length) forecastEvents[date] = nextTypes;
    else delete forecastEvents[date];
    api.setForecastEvents(
      forecastEvents,
      journal.forecastEventNotes || {},
      `${date.slice(0, 7)}-01`,
    );
  };

  const saveOtherNote = () => {
    const forecastEventNotes = { ...(journal.forecastEventNotes || {}) };
    forecastEventNotes[editingKey] = {
      ...(forecastEventNotes[editingKey] || {}),
      other: otherDraft,
    };
    api.setForecastEvents(
      journal.forecastEvents || {},
      forecastEventNotes,
      `${editingKey.slice(0, 7)}-01`,
    );
  };

  const commitPromises = (items) => {
    api.setPromises(items.map((text) => text.trim()).filter(Boolean));
  };

  const cells = [];
  for (let i = 0; i < first; i += 1) {
    cells.push(<div key={`blank-${i}`} className="cell blank" />);
  }
  for (let day = 1; day <= days; day += 1) {
    const key = `${y}-${pad(m + 1)}-${pad(day)}`;
    const level = levelFromJournal(journal, key);
    const score = level * 25;
    const types = journal.forecastEvents?.[key] || [];
    const customNote = journal.forecastEventNotes?.[key]?.other;
    const entry = journal.entries[key];
    const fillColor =
      level >= 3
        ? 'var(--surge)'
        : level >= 2
          ? 'var(--surge-soft)'
          : 'var(--surge-wash)';
    const title = `급증도 ${score}% · ${LEVELS[level].label} · ${types.map(labelOf).join('·') || '일정 없음'}${customNote ? ` · ${customNote}` : ''}`;
    cells.push(
      <button
        type="button"
        key={key}
        className={`cell${key === todayKey ? ' today' : ''}${key === editingKey ? ' active' : ''}`}
        title={title}
        aria-label={`${m + 1}월 ${day}일, ${title}`}
        aria-pressed={key === editingKey}
        onClick={() => setEditingKey(editingKey === key ? null : key)}
      >
        <span className="dn">{day}</span>
        {level > 0 && (
          <span
            className="fill"
            style={{ height: `${level * 25}%`, background: fillColor }}
          />
        )}
        {entry &&
          (entry.none ? (
            <span className="gd none" />
          ) : entry.kept.length || entry.met ? (
            <span className="gd" />
          ) : null)}
      </button>,
    );
  }

  return (
    <section className="page on">
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow">월초 리추얼 · 15분</div>
        <h2 className="serif" style={{ fontSize: 22, margin: '8px 0 6px' }}>
          이번 달 물때 예보
        </h2>
        <p className="lead">
          날짜별 일정을 표시하고, 그날 예상되는 급증 정도를 골라주세요. 급증도는
          25%씩 높아지며 달력 칸도 네 단계로 차오릅니다.
        </p>
        <div className="datebar" style={{ margin: '18px 0 16px' }}>
          <button
            className="nav"
            onClick={() => stepMonth(-1)}
            aria-label="이전 달"
          >
            ‹
          </button>
          <span className="dlabel">
            {y}년 {m + 1}월
          </span>
          <button
            className="nav"
            onClick={() => stepMonth(1)}
            aria-label="다음 달"
          >
            ›
          </button>
        </div>
        <div className="calendar">
          {DOW.map((dayName) => (
            <div key={dayName} className="dow">
              {dayName}
            </div>
          ))}
        </div>
        <div className="calendar month-calendar" style={{ marginTop: 6 }}>
          {cells}
        </div>

        <p className="forecast-instruction">
          달력에서 날짜를 누르고, 어떤 일정이 있는지 표시한 뒤 예상 급증 정도를
          골라주세요.
        </p>

        {editingKey && (
          <div
            className="forecast-editor"
            aria-label={`${editingKey} 일정 입력`}
          >
            <div className="forecast-editor-heading">
              <div>
                <span className="eyebrow">일정과 예상 강도</span>
                <b>{editingKey}</b>
              </div>
              <button
                type="button"
                className="forecast-close"
                onClick={() => setEditingKey(null)}
                aria-label="일정 입력 닫기"
              >
                닫기
              </button>
            </div>

            <div className="forecast-field-label">어떤 일정이 있나요?</div>
            <div className="forecast-event-options">
              {eventTypes.map((type) => {
                const selected = selectedEvents.includes(type.key);
                return (
                  <button
                    type="button"
                    key={type.key}
                    className={`forecast-event-button${selected ? ' selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleEvent(editingKey, type.key)}
                  >
                    <span className="event-check" aria-hidden="true">
                      {selected ? '✓' : '+'}
                    </span>
                    {type.label_ko}
                  </button>
                );
              })}
            </div>

            {selectedEvents.includes('other') && (
              <div className="fld forecast-other-field">
                <label htmlFor="forecast-other-note">
                  기타 일정 내용을 적어주세요
                </label>
                <input
                  id="forecast-other-note"
                  type="text"
                  value={otherDraft}
                  onChange={(event) => setOtherDraft(event.target.value)}
                  onBlur={saveOtherNote}
                  placeholder="예: 중요한 미팅, 가족 행사"
                />
              </div>
            )}

            <div className="forecast-field-label">예상되는 급증 정도</div>
            <div
              className="forecast-level-options"
              role="radiogroup"
              aria-label="급증 정도"
            >
              {LEVELS.map(({ value, label }) => (
                <button
                  type="button"
                  key={value}
                  role="radio"
                  aria-checked={selectedLevel === value}
                  className={`forecast-level-button${selectedLevel === value ? ' selected' : ''}`}
                  onClick={() => api.setForecastLevel(editingKey, value)}
                >
                  <span>{label}</span>
                  <b>{value * 25}%</b>
                </button>
              ))}
            </div>
            <p className="forecast-current-level">
              선택한 급증도{' '}
              <strong>
                {selectedLevel * 25}% · {LEVELS[selectedLevel].label}
              </strong>
            </p>
          </div>
        )}

        <div className="flegend">
          {LEVELS.map(({ value, label }) => (
            <span className="sw" key={value}>
              <span
                className="box"
                style={{
                  background:
                    value === 0
                      ? 'var(--surface)'
                      : value < 3
                        ? 'var(--surge-soft)'
                        : 'var(--surge)',
                  opacity: value === 1 ? 0.45 : value === 2 ? 0.7 : 1,
                }}
              />
              {label} {value * 25}%
            </span>
          ))}
          <span className="sw">
            <span className="dot" style={{ background: 'var(--clay)' }} />
            고요 기록됨
          </span>
          <span className="sw">
            <span
              className="dot"
              style={{ border: '1.5px solid var(--muted)' }}
            />
            고요 없던 날
          </span>
        </div>
      </div>

      <div className="card">
        <div className="eyebrow">이번 달 고요 약속</div>
        <h2 className="serif" style={{ fontSize: 20, margin: '8px 0 4px' }}>
          1~3개, 고요 습관만
        </h2>
        <p className="lead" style={{ marginBottom: 16 }}>
          일반 할 일 리스트가 아니에요. 몰아침 전후에 <b>고요를 넣는</b> 약속만,
          아주 사소해도 좋아요.
        </p>
        {promises.map((promise, index) => (
          <div key={`${index}-${promise}`} className="promiseedit">
            <input
              type="text"
              value={promise}
              onChange={(event) =>
                setPromises(
                  promises.map((item, itemIndex) =>
                    itemIndex === index ? event.target.value : item,
                  ),
                )
              }
              onBlur={() => commitPromises(promises)}
            />
            <button
              className="del"
              aria-label="삭제"
              onClick={() => {
                const next = promises.filter(
                  (_, itemIndex) => itemIndex !== index,
                );
                setPromises(next);
                commitPromises(next);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="addpromise"
          disabled={promises.length >= 3}
          onClick={() => {
            const next = [...promises, '새 고요 약속'];
            setPromises(next);
            commitPromises(next);
          }}
        >
          {promises.length >= 3
            ? '약속은 3개까지 (덜어내는 것도 고요)'
            : '+ 고요 약속 추가'}
        </button>
      </div>
    </section>
  );
}

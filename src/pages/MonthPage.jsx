import { useEffect, useState } from 'react'
import { pad, iso, DOW, FORECAST_EVENT_TYPES } from '../lib/data'

export default function MonthPage({ journal, api, today }) {
  const [mv, setMv] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [promises, setPromises] = useState(journal.promises)
  const [editingKey, setEditingKey] = useState(null)
  useEffect(() => { setPromises(journal.promises) }, [journal.promises])

  const { y, m } = mv
  const first = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const todayKey = iso(today)
  const eventTypes = journal.eventTypes?.length ? journal.eventTypes : FORECAST_EVENT_TYPES
  const labelOf = (typeKey) => eventTypes.find((t) => t.key === typeKey)?.label_ko || typeKey

  const stepMonth = (n) => { let mm = m + n, yy = y; if (mm < 0) { mm = 11; yy-- } if (mm > 11) { mm = 0; yy++ }; setMv({ y: yy, m: mm }); setEditingKey(null) }
  const toggleEvent = (key, typeKey) => {
    const current = journal.forecastEvents[key] || []
    const next = current.includes(typeKey) ? current.filter((t) => t !== typeKey) : [...current, typeKey]
    const nc = { ...journal.forecastEvents }
    if (next.length) nc[key] = next; else delete nc[key]
    api.setForecastEvents(nc)
  }
  const commitPromises = (arr) => { const cleaned = arr.map((s) => s.trim()).filter(Boolean); api.setPromises(cleaned) }

  const cells = []
  for (let i = 0; i < first; i++) cells.push(<div key={'b' + i} className="cell blank" />)
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`
    const f = journal.forecast[key] || 0
    const types = journal.forecastEvents[key] || []
    const e = journal.entries[key]
    const fillH = (f / 100) * 44
    const fillBg = f >= 66 ? 'var(--surge)' : f >= 38 ? 'var(--surge-soft)' : 'var(--surge-wash)'
    cells.push(
      <div key={key} className={'cell' + (key === todayKey ? ' today' : '') + (key === editingKey ? ' active' : '')} title={`예보: ${types.map(labelOf).join('·') || '없음'}` + (e ? ` · 실제 ${e.surge}%` : '')} onClick={() => setEditingKey(editingKey === key ? null : key)}>
        <span className="dn">{d}</span>
        {f > 0 && <div className="fill" style={{ height: fillH, background: fillBg, opacity: f >= 66 ? 0.9 : 0.7 }} />}
        {e && (e.none ? <span className="gd none" /> : (e.kept.length || e.met) ? <span className="gd" /> : null)}
      </div>
    )
  }

  return (
    <section className="page on">
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow">월초 리추얼 · 15분</div>
        <h2 className="serif" style={{ fontSize: 22, margin: '8px 0 6px' }}>이번 달 물때 예보</h2>
        <p className="lead">밀려올 파도를 미리 압니다. 날짜를 눌러 그날 무슨 일정이 있는지 표시하고(마감·출장·아이 일정), 아래에서 이번 달 고요 약속을 정하세요. <span className="muted">겹치는 일정이 많을수록 물이 더 차올라요 — 급증 점수는 표시한 일정으로 자동 계산돼요.</span></p>
        <div className="datebar" style={{ margin: '18px 0 16px' }}>
          <button className="nav" onClick={() => stepMonth(-1)} aria-label="이전 달">‹</button>
          <span className="dlabel">{y}년 {m + 1}월</span>
          <button className="nav" onClick={() => stepMonth(1)} aria-label="다음 달">›</button>
        </div>
        <div className="calendar">{DOW.map((d) => <div key={d} className="dow">{d}</div>)}</div>
        <div className="calendar" style={{ marginTop: 6 }}>{cells}</div>

        {editingKey && (
          <div style={{ marginTop: 14, padding: 14, border: '1px solid var(--line)', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <b>{editingKey} 일정</b>
              <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditingKey(null)}>닫기</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {eventTypes.map((t) => {
                const active = (journal.forecastEvents[editingKey] || []).includes(t.key)
                return (
                  <button
                    key={t.key}
                    onClick={() => toggleEvent(editingKey, t.key)}
                    className="btn ghost"
                    style={{
                      padding: '8px 14px',
                      fontSize: 13.5,
                      borderColor: active ? 'var(--surge)' : undefined,
                      background: active ? 'var(--surge-wash)' : undefined,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {t.label_ko}
                  </button>
                )
              })}
            </div>
            <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
              급증 점수: {journal.forecast[editingKey] || 0}%
            </p>
          </div>
        )}

        <div className="flegend">
          <span className="sw"><span className="box" style={{ background: 'var(--surface)' }} />잔잔</span>
          <span className="sw"><span className="box" style={{ background: 'var(--surge-soft)' }} />다소 몰아침</span>
          <span className="sw"><span className="box" style={{ background: 'var(--surge)' }} />몰아침</span>
          <span className="sw"><span className="dot" style={{ background: 'var(--clay)' }} />고요 기록됨</span>
          <span className="sw"><span className="dot" style={{ border: '1.5px solid var(--muted)' }} />고요 없던 날</span>
        </div>
      </div>

      <div className="card">
        <div className="eyebrow">이번 달 고요 약속</div>
        <h2 className="serif" style={{ fontSize: 20, margin: '8px 0 4px' }}>1~3개, 고요 습관만</h2>
        <p className="lead" style={{ marginBottom: 16 }}>일반 할 일 리스트가 아니에요. 몰아침 전후에 <b>고요를 넣는</b> 약속만, 아주 사소해도 좋아요.</p>
        {promises.map((p, i) => (
          <div key={i} className="promiseedit">
            <input type="text" value={p} onChange={(e) => setPromises(promises.map((x, j) => (j === i ? e.target.value : x)))}
              onBlur={() => commitPromises(promises)} />
            <button className="del" aria-label="삭제" onClick={() => { const arr = promises.filter((_, j) => j !== i); setPromises(arr); commitPromises(arr) }}>×</button>
          </div>
        ))}
        <button className="addpromise" disabled={promises.length >= 3}
          onClick={() => { const arr = [...promises, '새 고요 약속']; setPromises(arr); commitPromises(arr) }}>
          {promises.length >= 3 ? '약속은 3개까지 (덜어내는 것도 고요)' : '+ 고요 약속 추가'}
        </button>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { pad, iso, DOW } from '../lib/data'

const FMAP = ['없음', '잔잔', '다소', '몰아침', '큰 몰아침']

export default function MonthPage({ journal, api, today }) {
  const [mv, setMv] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [promises, setPromises] = useState(journal.promises)
  useEffect(() => { setPromises(journal.promises) }, [journal.promises])

  const { y, m } = mv
  const first = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const todayKey = iso(today)

  const stepMonth = (n) => { let mm = m + n, yy = y; if (mm < 0) { mm = 11; yy-- } if (mm > 11) { mm = 0; yy++ }; setMv({ y: yy, m: mm }) }
  const cycle = (key) => {
    const f = journal.forecast[key] || 0, nf = (f + 1) % 5
    const nc = { ...journal.forecast }
    if (nf === 0) delete nc[key]; else nc[key] = nf
    api.setForecast(nc)
  }
  const commitPromises = (arr) => { const cleaned = arr.map((s) => s.trim()).filter(Boolean); api.setPromises(cleaned) }

  const cells = []
  for (let i = 0; i < first; i++) cells.push(<div key={'b' + i} className="cell blank" />)
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`
    const f = journal.forecast[key] || 0
    const e = journal.entries[key]
    const fillH = f * 11
    const fillBg = f >= 3 ? 'var(--surge)' : f === 2 ? 'var(--surge-soft)' : 'var(--surge-wash)'
    cells.push(
      <div key={key} className={'cell' + (key === todayKey ? ' today' : '')} title={`예보: ${FMAP[f]}` + (e ? ` · 실제 ${e.surge}%` : '')} onClick={() => cycle(key)}>
        <span className="dn">{d}</span>
        {f > 0 && <div className="fill" style={{ height: fillH, background: fillBg, opacity: f >= 3 ? 0.9 : 0.7 }} />}
        {e && (e.none ? <span className="gd none" /> : (e.kept.length || e.met) ? <span className="gd" /> : null)}
      </div>
    )
  }

  return (
    <section className="page on">
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow">월초 리추얼 · 15분</div>
        <h2 className="serif" style={{ fontSize: 22, margin: '8px 0 6px' }}>이번 달 물때 예보</h2>
        <p className="lead">밀려올 파도를 미리 압니다. 몰아칠 주간을 달력에 색칠하고(마감·출장·아이 일정), 아래에서 이번 달 고요 약속을 정하세요. <span className="muted">날짜를 누를수록 물이 차오르고, 가장 몰아치는 날은 칸의 절반까지 채워져요.</span></p>
        <div className="datebar" style={{ margin: '18px 0 16px' }}>
          <button className="nav" onClick={() => stepMonth(-1)} aria-label="이전 달">‹</button>
          <span className="dlabel">{y}년 {m + 1}월</span>
          <button className="nav" onClick={() => stepMonth(1)} aria-label="다음 달">›</button>
        </div>
        <div className="calendar">{DOW.map((d) => <div key={d} className="dow">{d}</div>)}</div>
        <div className="calendar" style={{ marginTop: 6 }}>{cells}</div>
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

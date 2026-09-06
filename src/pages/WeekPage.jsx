import { useMemo, useState } from 'react'
import { iso, DOW, startOfWeek } from '../lib/data'
import { buildWeekWave } from '../lib/render'

export default function WeekPage({ journal, today }) {
  const [wkStart, setWkStart] = useState(() => startOfWeek(today))
  const days = useMemo(() => [...Array(7)].map((_, i) => { const d = new Date(wkStart); d.setDate(d.getDate() + i); return d }), [wkStart])
  const entryOf = (k) => journal.entries[k] || null
  const thisWk = startOfWeek(today)
  const isThisWeek = iso(wkStart) >= iso(thisWk)

  const svg = useMemo(() => buildWeekWave(days, entryOf, iso), [days, journal.entries])
  const es = days.map((d) => entryOf(iso(d))).filter(Boolean)
  const recorded = es.length
  const noneN = es.filter((e) => e.none).length
  const keptTotal = es.reduce((a, e) => a + (e.none ? 0 : e.kept.length), 0)
  const metMin = es.reduce((a, e) => a + ((e.met && e.met.min) || 0), 0)
  const avgS = recorded ? Math.round(es.reduce((a, e) => a + e.surge, 0) / recorded) : 0

  const cnt = {}
  es.forEach((e) => e.body.forEach((t) => (cnt[t] = (cnt[t] || 0) + 1)))
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const stats = [[recorded + '일', '기록한 날'], [keptTotal + '번', '들인 고요'], [metMin + '분', '찾아온 고요'], [avgS + '%', '평균 몰아침'], [noneN + '일', '고요 없던 날']]

  const shift = (n) => { const d = new Date(wkStart); d.setDate(d.getDate() + n * 7); setWkStart(d) }

  return (
    <section className="page on">
      <div className="card">
        <div className="datebar" style={{ marginBottom: 18 }}>
          <button className="nav" onClick={() => shift(-1)} aria-label="이전 주">‹</button>
          <span className="dlabel">{wkStart.getMonth() + 1}.{wkStart.getDate()} – {days[6].getMonth() + 1}.{days[6].getDate()}</span>
          <button className="nav" onClick={() => shift(1)} disabled={isThisWeek} aria-label="다음 주">›</button>
          {!isThisWeek && <button className="today" onClick={() => setWkStart(startOfWeek(today))}>이번 주로</button>}
        </div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>손으로 그리는 물결</div>
        <p className="lead" style={{ marginBottom: 14 }}>매일의 몰아침을 이어 그리면 일주일의 파도가 완성됩니다. 이번 주의 결을 한눈에.</p>
        <div className="weekwave">
          {svg
            ? <div dangerouslySetInnerHTML={{ __html: svg }} />
            : <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 0' }}>이번 주엔 아직 기록이 없어요. <b style={{ color: 'var(--surge)' }}>오늘</b> 탭에서 첫 물결을 그려보세요.</div>}
        </div>
        <div className="weekgrid">
          {days.map((d) => {
            const e = entryOf(iso(d))
            return (
              <div key={iso(d)} className={'wd' + (!e ? ' empty' : '') + (e && e.none ? ' none-day' : '')}>
                <div className="wdn">{DOW[d.getDay()]}</div>
                <div className="wdd">{d.getDate()}</div>
                {e ? (e.none
                  ? <div className="wg">고요 없음</div>
                  : <><div className="wsurge">{e.surge}%</div><div className="wg">들임 <b>{e.kept.length}</b>{e.met ? <> · 찾아옴 <b>1</b></> : null}</div></>)
                  : <div className="wg">—</div>}
              </div>
            )
          })}
        </div>
        <div className="wsummary">
          {stats.map(([v, l]) => <div key={l} className="stat"><div className="sv tnum">{v}</div><div className="sl">{l}</div></div>)}
        </div>
        {top.length > 0 && (
          <div className="tagcloud">
            <span className="muted" style={{ fontSize: 12.5, alignSelf: 'center', marginRight: 4 }}>이번 주 몸의 결:</span>
            {top.map(([t, n]) => <span key={t} className="tc">{t} {n > 1 ? <b>{n}</b> : null}</span>)}
          </div>
        )}
      </div>
    </section>
  )
}

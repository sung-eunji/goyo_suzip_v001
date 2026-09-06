import { useEffect, useMemo, useRef, useState } from 'react'
import { pad } from '../lib/data'
import { buildChart, buildInsight, monthChartData } from '../lib/render'

export default function ChartPage({ journal, today }) {
  const [cv, setCv] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [mode, setMode] = useState('chart')
  const hostRef = useRef(null)
  const tipRef = useRef(null)

  const data = useMemo(() => monthChartData(cv.y, cv.m, journal.forecast, (k) => journal.entries[k] || null), [cv, journal])
  const svg = useMemo(() => buildChart(data), [data])
  const insight = useMemo(() => buildInsight(data), [data])

  useEffect(() => {
    if (mode !== 'chart') return
    const host = hostRef.current, tip = tipRef.current
    if (!host || !tip) return
    const marks = host.querySelectorAll('.gm')
    const onEnter = (c) => {
      const p = data.find((x) => x.d == c.dataset.d); if (!p) return
      const e = p.e
      let html = `<div class="gt-d">${cv.m + 1}월 ${p.d}일</div>몰아침 ${p.actual}%`
      if (e.none) html += `<br>고요 없던 날`
      else { if (e.kept.length) html += `<br>들인 고요 ${e.kept.length}개`; if (e.met && e.met.min) html += `<br>찾아온 고요 ${e.met.min}분${e.met.moment ? ` · ${e.met.moment}` : ''}` }
      tip.innerHTML = html; tip.style.opacity = 1
      const hb = host.getBoundingClientRect(), cb = c.getBoundingClientRect()
      tip.style.left = cb.left - hb.left + cb.width / 2 + 'px'
      tip.style.top = cb.top - hb.top - tip.offsetHeight - 8 + 'px'
      tip.style.transform = 'translateX(-50%)'
    }
    const enters = [], leaves = []
    marks.forEach((c) => {
      c.style.cursor = 'pointer'
      const en = () => onEnter(c), lv = () => (tip.style.opacity = 0)
      c.addEventListener('mouseenter', en); c.addEventListener('mouseleave', lv)
      enters.push([c, en]); leaves.push([c, lv])
    })
    return () => { enters.forEach(([c, en]) => c.removeEventListener('mouseenter', en)); leaves.forEach(([c, lv]) => c.removeEventListener('mouseleave', lv)) }
  }, [svg, mode, data, cv])

  const stepMonth = (n) => { let mm = cv.m + n, yy = cv.y; if (mm < 0) { mm = 11; yy-- } if (mm > 11) { mm = 0; yy++ }; setCv({ y: yy, m: mm }) }

  const rows = data.filter((p) => p.actual !== null || p.forecast !== null).map((p) => {
    const e = p.e
    const goyo = e ? (e.none ? '없음' : (e.kept.length || e.met) ? `지킴 ${e.kept.length}${e.met && e.met.min ? ` · ${e.met.min}분` : ''}` : '—') : ''
    return { p, e, goyo }
  })

  return (
    <section className="page on">
      <div className="card chartcard">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="eyebrow">월간 흐름</div>
            <h2 className="serif" style={{ fontSize: 20, margin: '8px 0 2px' }}>몰아친 주에, 고요는 사라졌나 지켜졌나</h2>
          </div>
          <div className="datebar" style={{ margin: 0 }}>
            <button className="nav" onClick={() => stepMonth(-1)} aria-label="이전 달">‹</button>
            <span className="dlabel" style={{ fontSize: 16 }}>{cv.y}.{pad(cv.m + 1)}</span>
            <button className="nav" onClick={() => stepMonth(1)} aria-label="다음 달">›</button>
          </div>
        </div>
        <div className="clegend" style={{ marginTop: 14 }}>
          <span className="li"><span className="ln" />실제 몰아침</span>
          <span className="li"><span className="ln dash" />예보</span>
          <span className="li"><span className="dt" />고요 (점 크기 = 분)</span>
          <span className="li"><span className="rg" />고요 없던 날</span>
          <span className="viewtoggle">
            <button className={mode === 'chart' ? 'on' : ''} onClick={() => setMode('chart')}>그래프</button>
            <button className={mode === 'table' ? 'on' : ''} onClick={() => setMode('table')}>표</button>
          </span>
        </div>

        {mode === 'chart' ? (
          <div style={{ position: 'relative' }} ref={hostRef}>
            <div className="chart-scroll"><div dangerouslySetInnerHTML={{ __html: svg }} /></div>
            <div className="gtip" ref={tipRef} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dtable">
              <thead><tr><th>날짜</th><th>예보</th><th>실제</th><th>고요</th><th>몸 감각</th></tr></thead>
              <tbody>
                {rows.map(({ p, e, goyo }) => (
                  <tr key={p.d}><td>{p.d}일</td><td>{p.forecast ?? '—'}</td><td>{p.actual ?? '—'}</td><td>{goyo}</td>
                    <td className="muted">{e && e.body ? e.body.join(', ') : ''}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="insightbox" dangerouslySetInnerHTML={{ __html: insight }} />
      </div>
    </section>
  )
}

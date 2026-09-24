// 순수 SVG 빌더 — 주간 물결 & 월간 흐름 차트 (아티팩트 로직 이식)
import { DOW, pad } from './data'

export const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

// 주간 "손으로 그리는 물결" — days: Date[7], entryOf: (isoDate)->entry|null
export function buildWeekWave(days, entryOf, isoFn) {
  const W = 680, H = 200, pl = 24
  const xs = (i) => pl + i * ((W - pl * 2) / 6)
  const yFor = (s) => H - 30 - (s / 100) * (H - 70)
  const pts = days.map((d, i) => { const e = entryOf(isoFn(d)); return { x: xs(i), s: e ? e.surge : null, e } })
  const valid = pts.filter((p) => p.s !== null)
  const surge = cssv('--surge'), line = cssv('--line'), muted = cssv('--muted'), clay = cssv('--clay')
  let dPath = '', started = false
  const seg = pts.map((p) => (p.s !== null ? { x: p.x, y: yFor(p.s) } : null))
  for (let i = 0; i < seg.length; i++) {
    if (seg[i]) {
      if (!started) { dPath += `M${seg[i].x},${seg[i].y}`; started = true }
      else { const p0 = seg[i - 1] || seg[i], p1 = seg[i]; const cx = (p0.x + p1.x) / 2; dPath += ` C${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}` }
    } else started = false
  }
  let dots = ''
  pts.forEach((p) => {
    if (p.s === null) return
    const y = yFor(p.s)
    dots += `<circle cx="${p.x}" cy="${y}" r="4.5" fill="${surge}" stroke="var(--surface)" stroke-width="2"/>`
    if (p.e && (p.e.kept.length || p.e.met) && !p.e.none) dots += `<circle cx="${p.x}" cy="${y - 13}" r="4" fill="${clay}"/>`
    if (p.e && p.e.none) dots += `<circle cx="${p.x}" cy="${y - 13}" r="4" fill="none" stroke="${muted}" stroke-width="1.5"/>`
  })
  if (!valid.length) return ''
  const lastX = pts.filter((p) => p.s !== null).slice(-1)[0].x
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="이번 주 몰아침 물결">
    <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${surge}" stop-opacity=".28"/><stop offset="1" stop-color="${surge}" stop-opacity="0"/></linearGradient></defs>
    ${days.map((d, i) => `<line x1="${xs(i)}" y1="20" x2="${xs(i)}" y2="${H - 24}" stroke="${line}" stroke-width="1"/>`).join('')}
    ${dPath ? `<path d="${dPath} L${lastX},${H - 24} L${valid[0].x},${H - 24} Z" fill="url(#wg)" stroke="none"/>` : ''}
    ${dPath ? `<path d="${dPath}" fill="none" stroke="${surge}" stroke-width="2.5" stroke-linecap="round"/>` : ''}
    ${dots}
    ${days.map((d, i) => `<text x="${xs(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${muted}" font-family="IBM Plex Sans KR">${DOW[d.getDay()]}</text>`).join('')}
  </svg>`
}

// 월간 흐름 차트 — data: [{d,key,forecast,actual,e}]
export function buildChart(data) {
  const days = data.length
  const W = Math.max(660, days * 22), H = 340, ml = 38, mr = 14, mt = 16, mb = 34
  const iw = W - ml - mr, ih = H - mt - mb
  const x = (d) => ml + (d - 1) * (iw / (days - 1))
  const y = (v) => mt + ih - (v / 100) * ih
  const surge = cssv('--surge'), surgeSoft = cssv('--surge-soft'), clay = cssv('--clay'), line = cssv('--line'), muted = cssv('--muted')
  let g = ''
  ;[0, 25, 50, 75, 100].forEach((v) => { g += `<line x1="${ml}" y1="${y(v)}" x2="${W - mr}" y2="${y(v)}" stroke="${line}" stroke-width="1"/><text x="${ml - 8}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="${muted}">${v}</text>` })
  let ticks = ''
  data.forEach((p) => { if (p.d % 5 === 0 || p.d === 1) ticks += `<text x="${x(p.d)}" y="${H - 10}" text-anchor="middle" font-size="10" fill="${muted}">${p.d}</text>` })
  let fpath = ''
  data.forEach((p) => { if (p.forecast !== null) fpath += (fpath ? ' L' : 'M') + x(p.d) + ',' + y(p.forecast) })
  let apath = '', started = false, areaPts = []
  data.forEach((p) => { if (p.actual !== null) { apath += (started ? ' L' : 'M') + x(p.d) + ',' + y(p.actual); started = true; areaPts.push([x(p.d), y(p.actual)]) } else started = false })
  let area = ''
  if (areaPts.length > 1) area = `M${areaPts[0][0]},${y(0)} ` + areaPts.map((p) => `L${p[0]},${p[1]}`).join(' ') + ` L${areaPts[areaPts.length - 1][0]},${y(0)} Z`
  let dots = ''
  data.forEach((p) => {
    if (!p.e) return
    if (p.e.none) { dots += `<circle class="gm" data-d="${p.d}" cx="${x(p.d)}" cy="${y(p.actual)}" r="5" fill="none" stroke="${muted}" stroke-width="1.5"/>`; return }
    const min = (p.e.met && p.e.met.min) || 0, kept = p.e.kept.length
    if (kept || min) { const r = 4 + Math.min(9, min * 0.4 + kept * 1.2); dots += `<circle class="gm" data-d="${p.d}" cx="${x(p.d)}" cy="${y(p.actual)}" r="${r}" fill="${clay}" fill-opacity=".85" stroke="var(--surface)" stroke-width="1.5"/>` }
  })
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="월간 몰아침 예보 대비 실제와 고요 기록">
    ${g}${ticks}
    ${area ? `<path d="${area}" fill="${surge}" fill-opacity=".08"/>` : ''}
    ${fpath ? `<path d="${fpath}" fill="none" stroke="${surgeSoft}" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round"/>` : ''}
    ${apath ? `<path d="${apath}" fill="none" stroke="${surge}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${dots}
  </svg>`
}

export function buildInsight(data) {
  const rec = data.filter((p) => p.actual !== null)
  if (rec.length < 3) return `아직 이야기를 그리기엔 기록이 적어요. 며칠 더 쌓이면 <b>몰아친 주에 고요가 어떻게 됐는지</b> 여기서 보여드릴게요.`
  const surgeDays = rec.filter((p) => p.actual >= 66), calmDays = rec.filter((p) => p.actual < 50)
  const rate = (arr) => { if (!arr.length) return null; const gk = arr.filter((p) => p.e && !p.e.none && (p.e.kept.length || p.e.met)).length; return Math.round((gk / arr.length) * 100) }
  const sr = rate(surgeDays), cr = rate(calmDays)
  const noneOnSurge = surgeDays.filter((p) => p.e && p.e.none).length
  if (sr !== null && cr !== null) {
    let msg = `몰아친 날(${surgeDays.length}일) 중 <b>${sr}%</b>에 고요가 남아 있었고, 잔잔한 날(${calmDays.length}일)엔 <b>${cr}%</b>였어요. `
    msg += sr < cr - 15
      ? `파도가 높을수록 고요가 먼저 밀려났네요 — 다음 달 예보에서 그 주간을 더 짧고 낮은 약속으로 준비해봐도 좋겠어요.`
      : `몰아치는 중에도 고요를 꽤 지켰어요. 폭풍의 눈이 자리를 잡고 있다는 신호입니다.`
    if (noneOnSurge) msg += ` <span class="muted">(그 중 ${noneOnSurge}일은 "고요 없음" — 그것도 정식 기록이에요.)</span>`
    return msg
  }
  return `몰아친 날과 잔잔한 날을 비교하려면 양쪽 기록이 더 필요해요.`
}

export function monthChartData(y, m, forecast, entryOf) {
  const days = new Date(y, m + 1, 0).getDate()
  return [...Array(days)].map((_, i) => {
    const d = i + 1, key = `${y}-${pad(m + 1)}-${pad(d)}`
    const f = forecast[key] || 0, e = entryOf(key)
    return { d, key, forecast: f || null, actual: e ? e.surge : null, e }
  })
}

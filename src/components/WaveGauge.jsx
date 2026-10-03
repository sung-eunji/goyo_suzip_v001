import { useEffect, useRef } from 'react'
import { cssv } from '../lib/render'
import { surgeLabel } from '../lib/data'

export default function WaveGauge({ value, onChange, step = 10 }) {
  const canvasRef = useRef(null)
  const targetRef = useRef(value)
  const dispRef = useRef(value)
  const phaseRef = useRef(0)
  useEffect(() => { targetRef.current = value }, [value])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches
    let raf
    const size = () => { const r = canvas.getBoundingClientRect(); canvas.width = r.width * DPR; canvas.height = 200 * DPR }
    size(); window.addEventListener('resize', size)
    const hexA = (hex, a) => { hex = hex.replace('#', ''); if (hex.length === 3) hex = hex.split('').map((c) => c + c).join(''); const n = parseInt(hex, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }
    const waveY = (x, w, L, amp) => { let y = 0, norm = 0; for (const c of L.waves) { y += Math.sin((x / w) * Math.PI * 2 * c.k + phaseRef.current * c.sp + L.ph) * c.a; norm += c.a } return (y / norm) * amp }
    function draw() {
      dispRef.current += (targetRef.current - dispRef.current) * 0.05
      const w = canvas.width, h = canvas.height, s = dispRef.current / 100
      ctx.clearRect(0, 0, w, h)
      const baseY = h * 0.6, amp = (5 + s * 36) * DPR, sec = 0.26 + s * 0.26
      const c1 = cssv('--surge'), c2 = cssv('--surge-soft')
      const layers = [
        { col: c2, alpha: 0.36, yo: 14 * DPR, ph: 0.0, waves: [{ k: 1.4, a: 1, sp: 0.5 }, { k: 2.6, a: sec, sp: 0.82 }] },
        { col: c1, alpha: 0.9, yo: 0, ph: 1.7, waves: [{ k: 1.1, a: 1, sp: 0.4 }, { k: 2.0, a: sec, sp: 0.66 }] },
      ]
      for (const L of layers) {
        ctx.beginPath(); ctx.moveTo(0, h)
        for (let x = 0; x <= w; x += 5) ctx.lineTo(x, baseY + L.yo + waveY(x, w, L, amp))
        ctx.lineTo(w, h); ctx.closePath()
        const g = ctx.createLinearGradient(0, baseY - amp, 0, h)
        g.addColorStop(0, hexA(L.col, L.alpha)); g.addColorStop(1, hexA(L.col, L.alpha * 0.2))
        ctx.fillStyle = g; ctx.fill()
        ctx.strokeStyle = hexA(L.col, Math.min(1, L.alpha + 0.12)); ctx.lineWidth = 2 * DPR; ctx.lineJoin = 'round'
        ctx.beginPath()
        for (let x = 0; x <= w; x += 5) { const y = baseY + L.yo + waveY(x, w, L, amp); x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
        ctx.stroke()
      }
      if (!REDUCE) phaseRef.current += 0.02
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [])

  return (
    <>
      <div className="gaugewrap">
        <canvas ref={canvasRef} />
        <div className="gaugetop"><div className="row">
          <span className="state serif">{surgeLabel(value)}</span>
          <span className="pct serif tnum">
            <input
              type="number"
              min="0"
              max="100"
              step={step}
              value={value}
              aria-label="몰아침 정도 직접 입력"
              onChange={(e) => {
                const n = Math.round((+e.target.value || 0) / step) * step
                onChange(Math.max(0, Math.min(100, n)))
              }}
              style={{ width: 56, textAlign: 'right', background: 'transparent', border: 'none', font: 'inherit', color: 'inherit' }}
            /><span style={{ fontSize: 16 }}>%</span>
          </span>
        </div></div>
      </div>
      <input type="range" min="0" max="100" step={step} value={value} className="slider" aria-label="몰아침 정도"
        onChange={(e) => onChange(+e.target.value)} />
      <div className="scaleends"><span>잔잔 — 물결은 늘 흐른다</span><span>몰아침</span></div>
    </>
  )
}

// Supabase 데이터 접근 계층 — 인증 + 프로필 + 저널(설정/기록) + 관리자
import { supabase, setRemember } from '../supabaseClient'

/* ---------------- 인증 ---------------- */

// 가입 없이 시작 (익명 로그인) + 프로필 생성
export async function startAnon(nickname, remember = true) {
  setRemember(remember)
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  await ensureProfile(nickname)
  return data.user
}

export async function login(email, password, remember = true) {
  setRemember(remember)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

// 익명 계정 → 정식 계정 전환 (같은 user id 유지 → 기록 보존)
export async function convertToAccount(email, password) {
  const { error } = await supabase.auth.updateUser({ email, password })
  if (error) throw error
}

export async function logout() {
  await supabase.auth.signOut()
}

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

export function onAuthChange(cb) {
  return supabase.auth.onAuthStateChange((_e, session) => cb(session?.user || null))
}

/* ---------------- 프로필 ---------------- */

export async function ensureProfile(nickname) {
  const { data: u } = await supabase.auth.getUser()
  const user = u?.user
  if (!user) return null
  const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (existing) return existing
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, nickname: nickname || '고요님' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function loadProfile() {
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', u.user.id).maybeSingle()
  return data
}

export async function updateNickname(nickname) {
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) return
  await supabase.from('profiles').update({ nickname }).eq('id', u.user.id)
}

/* ---------------- 저널: 설정(약속·예보) + 기록 ---------------- */

export async function fetchJournal(userId) {
  const [{ data: settings }, { data: entries }] = await Promise.all([
    supabase.from('settings').select('promises,forecast').eq('user_id', userId).maybeSingle(),
    supabase.from('entries').select('*').eq('user_id', userId),
  ])
  const map = {}
  ;(entries || []).forEach((e) => {
    map[e.date] = { surge: e.surge, kept: e.kept || [], met: e.met || null, body: e.body || [], none: !!e.none }
  })
  return {
    promises: settings?.promises || [],
    forecast: settings?.forecast || {},
    entries: map,
  }
}

export async function saveSettings(userId, promises, forecast) {
  await supabase.from('settings').upsert({ user_id: userId, promises, forecast })
}

export async function saveEntry(userId, date, e) {
  await supabase.from('entries').upsert({
    user_id: userId,
    date,
    surge: e.surge,
    kept: e.kept || [],
    met: e.met || null,
    body: e.body || [],
    none: !!e.none,
    updated_at: new Date().toISOString(),
  })
}

export async function deleteEntry(userId, date) {
  await supabase.from('entries').delete().eq('user_id', userId).eq('date', date)
}

// 데모 시드를 통째로 저장 (설정 + 여러 기록)
export async function saveWholeJournal(userId, S) {
  await saveSettings(userId, S.promises, S.forecast)
  const rows = Object.entries(S.entries).map(([date, e]) => ({
    user_id: userId, date, surge: e.surge, kept: e.kept || [], met: e.met || null,
    body: e.body || [], none: !!e.none, updated_at: new Date().toISOString(),
  }))
  if (rows.length) await supabase.from('entries').upsert(rows)
}

export async function clearMyEntries(userId) {
  await supabase.from('entries').delete().eq('user_id', userId)
  await saveSettings(userId, [], {})
}

/* ---------------- 관리자 (Gee가 참가자 전체 열람) ---------------- */

export async function adminOverview() {
  // RLS가 관리자에게 전체 select를 허용
  const [{ data: profiles }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('id,nickname,created_at,subscribed').order('created_at'),
    supabase.from('entries').select('user_id,date,surge,none,kept,met'),
  ])
  const byUser = {}
  ;(entries || []).forEach((e) => {
    const u = (byUser[e.user_id] = byUser[e.user_id] || { count: 0, none: 0, surgeSum: 0, kept: 0, met: 0, last: '' })
    u.count++
    if (e.none) u.none++
    u.surgeSum += e.surge || 0
    u.kept += (e.kept || []).length
    if (e.met && e.met.min) u.met += e.met.min
    if (e.date > u.last) u.last = e.date
  })
  return (profiles || []).map((p) => {
    const s = byUser[p.id] || { count: 0, none: 0, surgeSum: 0, kept: 0, met: 0, last: '' }
    return {
      id: p.id,
      nickname: p.nickname,
      subscribed: p.subscribed,
      joined: (p.created_at || '').slice(0, 10),
      days: s.count,
      noneDays: s.none,
      avgSurge: s.count ? Math.round(s.surgeSum / s.count) : 0,
      keptTotal: s.kept,
      metMin: s.met,
      lastEntry: s.last || '—',
    }
  })
}

export async function adminAllEntries() {
  const { data } = await supabase.from('entries').select('*')
  return data || []
}

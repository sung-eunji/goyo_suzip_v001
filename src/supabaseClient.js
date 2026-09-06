import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = !!(url && key)

// "로그인 유지" 토글: 켜짐 → localStorage(영구), 꺼짐 → sessionStorage(창 닫으면 로그아웃)
const REMEMBER_KEY = 'goyo.remember'
function rememberOn() {
  try { return localStorage.getItem(REMEMBER_KEY) !== '0' } catch { return true }
}
export function setRemember(on) {
  try { localStorage.setItem(REMEMBER_KEY, on ? '1' : '0') } catch {}
}

// 저장 위치를 토글에 따라 바꾸는 어댑터 (auth 호출 전에 setRemember를 부르면 그 위치로 기록됨)
const switchingStorage = {
  getItem: (k) => { try { return (rememberOn() ? localStorage : sessionStorage).getItem(k) } catch { return null } },
  setItem: (k, v) => { try { (rememberOn() ? localStorage : sessionStorage).setItem(k, v) } catch {} },
  removeItem: (k) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k) } catch {} },
}

export const supabase = isConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: switchingStorage,
        storageKey: 'goyo.auth',
      },
    })
  : null

import { supabase } from './supabase'

export type AuthUser = {
  id: string
  email: string | undefined
}

// 회원가입
export async function signUp(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!supabase) return { user: null, error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { user: null, error: error.message }
  const u = data.user
  return { user: u ? { id: u.id, email: u.email } : null, error: null }
}

// 로그인
export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!supabase) return { user: null, error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { user: null, error: error.message }
  const u = data.user
  return { user: u ? { id: u.id, email: u.email } : null, error: null }
}

// 로그아웃
export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

// 현재 유저
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  const u = data.user
  return u ? { id: u.id, email: u.email } : null
}

// 세션 변경 구독
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user
    callback(u ? { id: u.id, email: u.email } : null)
  })
  return () => data.subscription.unsubscribe()
}

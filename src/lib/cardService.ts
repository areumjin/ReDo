import { supabase } from './supabase'
import type { CardData } from '../types'

// Supabase row → CardData 변환
function rowToCard(row: Record<string, unknown>): CardData {
  return {
    id: typeof row.id === 'string' ? row.id.hashCode?.() ?? Math.abs(hashStr(row.id as string)) : Number(row.id),
    title: (row.title as string) || '제목 없음',
    image: (row.image_url as string) || '',
    projectTag: (row.project_tag as string) || '',
    savedReason: (row.saved_reason as string) || '',
    chips: (row.chips as string[]) || [],
    source: (row.source as string) || '',
    statusDot: mapStatus(row.status as string),
    daysAgo: formatDaysAgo(row.created_at as string),
    supabaseId: row.id as string,
    executionMemo: (row.execution_memo as string) || '',
  }
}

function hashStr(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    hash = (hash << 5) - hash + c
    hash |= 0
  }
  return hash
}

function mapStatus(status: string): '미실행' | '실행완료' | '보관중' {
  if (status === 'executed') return '실행완료'
  if (status === 'archived') return '보관중'
  return '미실행'
}

function formatDaysAgo(isoDate: string): string {
  if (!isoDate) return '방금 전'
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '오늘'
  if (days === 1) return '1일 전'
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  return `${Math.floor(days / 30)}달 전`
}

// CardData → Supabase INSERT row
function cardToInsertRow(card: Partial<CardData> & { urlValue?: string; userId?: string }) {
  return {
    user_id: card.userId || null,
    title: card.title || '새 레퍼런스',
    url: card.urlValue || null,
    image_url: card.image || null,
    saved_reason: card.savedReason || null,
    project_tag: card.projectTag || null,
    source: card.source || null,
    chips: card.chips || [],
    status: 'pending',
  }
}

// 전체 카드 조회 (created_at DESC)
export async function getCards(): Promise<CardData[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[cardService] getCards error:', error)
    return []
  }
  return (data || []).map((row) => rowToCard(row as Record<string, unknown>))
}

// 새 카드 저장
export async function saveCard(
  card: Partial<CardData> & { urlValue?: string; userId?: string }
): Promise<CardData | null> {
  if (!supabase) return null
  const row = cardToInsertRow(card)
  const { data, error } = await supabase.from('cards').insert(row).select().single()
  if (error) {
    console.error('[cardService] saveCard error:', error)
    return null
  }
  return rowToCard(data as Record<string, unknown>)
}

// 카드 상태 업데이트
export async function updateCardStatus(
  supabaseId: string,
  status: 'pending' | 'executed' | 'archived',
  memo?: string
): Promise<boolean> {
  if (!supabase) return false
  const updates: Record<string, unknown> = { status }
  if (memo !== undefined) updates.execution_memo = memo
  if (status === 'executed') updates.executed_at = new Date().toISOString()
  const { error } = await supabase.from('cards').update(updates).eq('id', supabaseId)
  if (error) {
    console.error('[cardService] updateCardStatus error:', error)
    return false
  }
  return true
}

// 카드 삭제
export async function deleteCard(supabaseId: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('cards').delete().eq('id', supabaseId)
  if (error) {
    console.error('[cardService] deleteCard error:', error)
    return false
  }
  return true
}

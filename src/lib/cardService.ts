// ─── Card Service — Supabase CRUD ────────────────────────────────────────────
//
// Supabase 테이블 스키마 (마이그레이션 SQL):
//
// CREATE TABLE IF NOT EXISTS cards (
//   id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id       uuid REFERENCES auth.users ON DELETE CASCADE,
//   title         text NOT NULL,
//   url           text,
//   image_url     text,
//   saved_reason  text,
//   project_tag   text,
//   source        text,
//   chips         text[]  DEFAULT '{}',
//   status        text    DEFAULT 'pending',   -- pending | executed | archived
//   content_type  text    DEFAULT 'general',   -- font | color | layout | article | mood | general
//   execution_memo text,
//   ai_analysis   jsonb,
//   created_at    timestamptz DEFAULT now(),
//   executed_at   timestamptz
// );
//
// CREATE TABLE IF NOT EXISTS executions (
//   id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   card_id     uuid REFERENCES cards ON DELETE CASCADE,
//   memo        text,
//   executed_at timestamptz DEFAULT now()
// );
//
// -- contentType 컬럼 추가 마이그레이션 (기존 테이블 업데이트 시):
// ALTER TABLE cards ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'general';
//
// -- RLS (Row Level Security) 정책:
// ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can only access their own cards"
//   ON cards FOR ALL USING (auth.uid() = user_id);

import { supabase } from './supabase'
import type { CardData } from '../types'

// ─── Supabase row → CardData 변환 ─────────────────────────────────────────────
function rowToCard(row: Record<string, unknown>): CardData {
  return {
    id: typeof row.id === 'string'
      ? Math.abs(hashStr(row.id as string))
      : Number(row.id),
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
    contentType: (row.content_type as CardData['contentType']) || 'general',
    urlValue: (row.url as string) || '',
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

// ─── CardData → Supabase INSERT row ─────────────────────────────────────────
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
    content_type: card.contentType || 'general',
  }
}

// ─── 전체 카드 조회 ──────────────────────────────────────────────────────────
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

// ─── 새 카드 저장 ────────────────────────────────────────────────────────────
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

// ─── 카드 상태 업데이트 ──────────────────────────────────────────────────────
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

// ─── 카드 삭제 ───────────────────────────────────────────────────────────────
export async function deleteCard(supabaseId: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('cards').delete().eq('id', supabaseId)
  if (error) {
    console.error('[cardService] deleteCard error:', error)
    return false
  }
  return true
}

// ─── 실행 기록 저장 (executions 테이블) ─────────────────────────────────────
export async function saveExecution(cardId: string, memo?: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('executions').insert({
    card_id: cardId,
    memo: memo || null,
  })
  if (error) {
    console.error('[cardService] saveExecution error:', error)
    return false
  }
  return true
}

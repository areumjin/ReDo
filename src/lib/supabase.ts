import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// PROMPT 10: 환경변수 누락 시 개발 모드 경고
if (!url || !key) {
  console.warn(
    '[ReDo] Supabase 환경변수가 설정되지 않았습니다.\n' +
    '  .env.local 파일에 다음 값을 추가하세요:\n' +
    '  VITE_SUPABASE_URL=your_project_url\n' +
    '  VITE_SUPABASE_ANON_KEY=your_anon_key\n' +
    '  → 미설정 시 SEED_CARDS 데이터로 데모 모드로 실행됩니다.'
  )
}

export const supabase = url && key ? createClient(url, key) : null

export type SupabaseClient = NonNullable<typeof supabase>

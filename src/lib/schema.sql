-- ReDo 카드 테이블
-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text,
  image_url text,
  saved_reason text,
  project_tag text,
  source text,
  chips text[],
  status text DEFAULT 'pending',
  execution_memo text,
  executed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Row Level Security (RLS) 활성화
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- 본인 카드만 읽기/쓰기 가능
CREATE POLICY "Users can select own cards" ON cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards" ON cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards" ON cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards" ON cards
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS cards_user_id_idx ON cards(user_id);
CREATE INDEX IF NOT EXISTS cards_created_at_idx ON cards(created_at DESC);

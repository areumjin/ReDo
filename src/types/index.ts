export type CardStatus = 'pending' | 'done'

export interface CardData {
  id: number
  title: string
  source: string
  sourceUrl?: string
  imageUrl?: string
  chips: string[]
  projectTag: string
  savedAt: string
  savedReason?: string
  status: CardStatus
}

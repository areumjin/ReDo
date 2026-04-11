import { CheckCircle2, Circle } from 'lucide-react'
import { CardData } from '@/types'
import { cn } from '@/components/ui/utils'

interface ActionScreenProps {
  cards: CardData[]
  executedCardIds: Set<number>
  onExecute: (id: number) => void
  onCardSelect: (card: CardData) => void
}

export default function ActionScreen({ cards, executedCardIds, onExecute, onCardSelect }: ActionScreenProps) {
  const done = executedCardIds.size
  const total = cards.length

  return (
    <div className="min-h-screen bg-surface-page">
      {/* TopBar */}
      <div className="px-6 pt-14 pb-5">
        <p className="text-[12px] text-text-tertiary mb-0.5">활용 현황</p>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-[22px] font-bold text-text-primary leading-none">
            {done}
            <span className="text-[14px] font-normal text-text-secondary ms-0.5">/{total}</span>
          </span>
          <span className="text-[13px] text-text-tertiary pb-0.5">활용 완료</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-300"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Cards */}
      <div className="px-6 space-y-3 pb-4">
        {cards.map(card => {
          const isDone = executedCardIds.has(card.id)
          return (
            <div
              key={card.id}
              className={cn(
                'bg-card rounded-2xl border p-4 transition-all duration-200',
                isDone ? 'border-border opacity-50' : 'border-border'
              )}
            >
              {/* Header row */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onExecute(card.id)}
                  className="mt-0.5 flex-shrink-0"
                  aria-label={isDone ? '완료 취소' : '활용 완료 표시'}
                >
                  {isDone
                    ? <CheckCircle2 className="size-5 text-success" strokeWidth={2} />
                    : <Circle className="size-5 text-surface-muted" strokeWidth={1.8} />
                  }
                </button>

                <button
                  className="flex-1 text-left"
                  onClick={() => onCardSelect(card)}
                >
                  <p className={cn(
                    'text-[14px] font-bold leading-snug line-clamp-2',
                    isDone ? 'line-through text-text-disabled' : 'text-text-primary'
                  )}>
                    {card.title}
                  </p>
                </button>
              </div>

              {/* Context box */}
              {card.savedReason && !isDone && (
                <div
                  className="mt-2.5 ms-8 rounded-xl px-3 py-2"
                  style={{ backgroundColor: 'var(--context-box-bg)' }}
                >
                  <p
                    className="text-[12px] leading-relaxed line-clamp-2"
                    style={{ color: 'var(--context-box-text)' }}
                  >
                    {card.savedReason}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-2.5 ms-8">
                <div className="flex gap-1.5 flex-wrap">
                  {card.chips.slice(0, 2).map(chip => (
                    <span
                      key={chip}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                        isDone
                          ? 'bg-surface-subtle text-text-disabled'
                          : 'bg-brand-tint text-brand'
                      )}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <span className="text-[12px] text-text-disabled">{card.source}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

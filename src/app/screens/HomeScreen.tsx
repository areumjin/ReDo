import { useState, useMemo } from 'react'
import { Bell, Search, Bookmark } from 'lucide-react'
import { CardData } from '@/types'
import { cn } from '@/components/ui/utils'

interface HomeScreenProps {
  cards: CardData[]
  onCardSelect: (card: CardData) => void
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: string[]
  active: string
  onChange: (f: string) => void
}

function FilterBar({ filters, active, onChange }: FilterBarProps) {
  return (
    <div className="flex gap-2 px-6 pb-4 overflow-x-auto scrollbar-hide">
      {filters.map(filter => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={cn(
            'flex-shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors duration-150',
            active === filter
              ? 'bg-brand text-white'
              : 'bg-surface-subtle text-text-secondary'
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  )
}

// ─── Reference Card ──────────────────────────────────────────────────────────

interface ReferenceCardProps {
  card: CardData
  onSelect: (card: CardData) => void
}

function ReferenceCard({ card, onSelect }: ReferenceCardProps) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <button
      onClick={() => onSelect(card)}
      className="w-full bg-card rounded-2xl border border-border overflow-hidden text-left active:scale-[0.99] transition-transform duration-100"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Image */}
      {card.imageUrl && !imgError ? (
        <div className="w-full aspect-[4/3] overflow-hidden bg-surface-subtle relative">
          {!imgLoaded && (
            <div className="absolute inset-0 shimmer" />
          )}
          <img
            src={card.imageUrl}
            alt=""
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={cn('w-full h-full object-cover transition-opacity duration-200', imgLoaded ? 'opacity-100' : 'opacity-0')}
          />
        </div>
      ) : (
        <div className="w-full aspect-[4/3] bg-brand-tint flex items-center justify-center">
          <Bookmark className="size-10 text-brand opacity-30" strokeWidth={1.5} />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Chips */}
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          {card.chips.slice(0, 3).map(chip => (
            <span
              key={chip}
              className="px-2 py-0.5 rounded-full bg-brand-tint text-brand text-[11px] font-semibold"
            >
              {chip}
            </span>
          ))}
        </div>

        {/* Title */}
        <p className="text-[14px] font-bold text-text-primary leading-snug mb-2.5 line-clamp-2">
          {card.title}
        </p>

        {/* Context box */}
        {card.savedReason && (
          <div
            className="rounded-xl px-3 py-2 mb-3"
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12px] text-text-tertiary truncate">{card.source}</span>
            <span className="text-text-disabled text-[11px]">·</span>
            <span className="text-[11px] text-text-disabled bg-surface-subtle px-1.5 py-0.5 rounded flex-shrink-0">
              {card.projectTag}
            </span>
          </div>
          <span className="text-[12px] text-text-disabled flex-shrink-0 ms-2">{card.savedAt}</span>
        </div>
      </div>
    </button>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: string }) {
  const isAll = filter === '전체'
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="size-16 rounded-2xl bg-surface-subtle flex items-center justify-center mb-5">
        <Bookmark className="size-7 text-text-disabled" strokeWidth={1.5} />
      </div>
      <p className="text-[16px] font-bold text-text-primary mb-2">
        {isAll ? '저장된 레퍼런스가 없어요' : `${filter}에 레퍼런스가 없어요`}
      </p>
      <p className="text-[13px] text-text-tertiary leading-relaxed">
        {isAll
          ? 'FAB 버튼을 눌러 첫 레퍼런스를 저장해보세요'
          : `다른 프로젝트 탭을 확인하거나\n새 레퍼런스를 저장해보세요`}
      </p>
    </div>
  )
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

const ALL = '전체'

export default function HomeScreen({ cards, onCardSelect }: HomeScreenProps) {
  const [activeFilter, setActiveFilter] = useState(ALL)

  const filters = useMemo(() => {
    const tags = Array.from(new Set(cards.map(c => c.projectTag)))
    return [ALL, ...tags]
  }, [cards])

  const filteredCards = useMemo(
    () => activeFilter === ALL ? cards : cards.filter(c => c.projectTag === activeFilter),
    [cards, activeFilter]
  )

  return (
    <div className="min-h-screen bg-surface-page">
      {/* TopBar */}
      <div className="flex items-center justify-between px-6 pt-14 pb-4">
        <div>
          <p className="text-[12px] text-text-tertiary mb-0.5">저장한 레퍼런스</p>
          <h1 className="text-[22px] font-bold text-text-primary leading-none">
            {filteredCards.length}
            <span className="text-[14px] font-normal text-text-secondary ms-1">개</span>
            {activeFilter !== ALL && (
              <span className="text-[13px] font-normal text-text-tertiary ms-1.5">
                · {activeFilter}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="size-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <Search className="size-[18px] text-icon-default" strokeWidth={1.8} />
          </button>
          <button className="size-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <Bell className="size-[18px] text-icon-default" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar filters={filters} active={activeFilter} onChange={setActiveFilter} />

      {/* Content */}
      {filteredCards.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <div className="px-6 space-y-3 pb-4">
          {filteredCards.map(card => (
            <ReferenceCard key={card.id} card={card} onSelect={onCardSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

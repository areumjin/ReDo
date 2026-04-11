import { ArrowLeft, ExternalLink, Share2 } from 'lucide-react'
import { CardData } from '@/types'
import { cn } from '@/components/ui/utils'

interface DetailScreenProps {
  card: CardData | null
  onClose: () => void
}

export default function DetailScreen({ card, onClose }: DetailScreenProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300',
          card ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full bg-surface-page flex flex-col transition-transform duration-300 ease-out',
          card ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ maxWidth: 375, right: '50%', transform: card ? 'translateX(50%)' : 'translateX(calc(50% + 375px))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-14 pb-4">
          <button
            onClick={onClose}
            className="size-10 rounded-xl bg-card border border-border flex items-center justify-center -ms-1"
          >
            <ArrowLeft className="size-[18px] text-icon-default" strokeWidth={1.8} />
          </button>

          <div className="flex items-center gap-2">
            <button className="size-10 rounded-xl bg-card border border-border flex items-center justify-center">
              <Share2 className="size-[17px] text-icon-default" strokeWidth={1.8} />
            </button>
            {card?.sourceUrl && (
              <a
                href={card.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="size-10 rounded-xl bg-card border border-border flex items-center justify-center"
              >
                <ExternalLink className="size-[17px] text-icon-default" strokeWidth={1.8} />
              </a>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 space-y-5 pb-10">
          {/* Chips */}
          {card && card.chips.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {card.chips.map(chip => (
                <span
                  key={chip}
                  className="px-2.5 py-1 rounded-full bg-brand-tint text-brand text-[12px] font-semibold"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-[22px] font-bold text-text-primary leading-snug tracking-tight">
            {card?.title}
          </h1>

          {/* Context box */}
          {card?.savedReason && (
            <div
              className="rounded-2xl px-4 py-3.5"
              style={{ backgroundColor: 'var(--context-box-bg)' }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: 'var(--context-box-text)', opacity: 0.6 }}
              >
                저장 이유
              </p>
              <p
                className="text-[14px] leading-normal"
                style={{ color: 'var(--context-box-text)' }}
              >
                {card.savedReason}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-card rounded-2xl border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px] text-text-secondary">출처</span>
              <span className="text-[13px] font-medium text-text-primary">{card?.source}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px] text-text-secondary">프로젝트</span>
              <span className="text-[13px] font-medium text-text-primary">{card?.projectTag}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px] text-text-secondary">저장일</span>
              <span className="text-[13px] font-medium text-text-primary">{card?.savedAt}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

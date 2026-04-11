import { useState, useRef, useEffect } from 'react'
import { Layers, MessageSquare, Zap } from 'lucide-react'
import { CardData } from '@/types'

// ─── Onboarding-only color palette (spec-exact values) ───────────────────────
const C = {
  brand:      '#6A70FF',
  headline:   '#2C2C2A',
  sub:        '#888780',
  inputBg:    '#F8F7F4',
  stepLabel:  '#AFA9EC',
  ctxBg:      '#EEEFFE',
  ctxText:    '#3C3489',
  ctxLabel:   '#534AB7',
  helper:     '#B4B2A9',
  danger:     '#E24B4A',
} as const

interface OnboardingScreenProps {
  onComplete: () => void
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="absolute top-0 inset-x-0 z-20" style={{ height: 3, backgroundColor: '#EBEBF0' }}>
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{ width: `${pct}%`, backgroundColor: C.brand }}
      />
    </div>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Layers,        label: '흩어진 레퍼런스를 한 곳에' },
  { Icon: MessageSquare, label: '저장 이유까지 기억해줘요' },
  { Icon: Zap,           label: '지금 필요한 것만 꺼내줘요' },
]

function Step1({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Hero — 40% */}
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ height: '40%', backgroundColor: C.brand }}
      >
        <button
          onClick={onSkip}
          className="absolute right-4"
          style={{ top: 52, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}
        >
          건너뛰기
        </button>
        <span style={{ color: '#fff', fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em' }}>
          ReDo
        </span>
      </div>

      {/* Body — 60% */}
      <div className="flex-1 bg-white overflow-y-auto flex flex-col px-4 pt-6 pb-8">
        <h1
          className="whitespace-pre-line leading-snug mb-2.5"
          style={{ fontSize: 22, fontWeight: 500, color: C.headline }}
        >
          {'저장만 하고\n잊고 있진 않나요?'}
        </h1>

        <p
          className="whitespace-pre-line leading-relaxed mb-7"
          style={{ fontSize: 14, color: C.sub }}
        >
          {'ReDo는 저장한 레퍼런스를\n다시 꺼내 작업으로 이어주는 시스템이에요.'}
        </p>

        {/* Feature rows */}
        <div className="flex flex-col mb-8" style={{ gap: 12 }}>
          {FEATURES.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, backgroundColor: C.brand }}
              >
                <Icon className="size-[15px] text-white" strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 14, color: C.headline }}>{label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onNext}
          className="w-full mt-auto"
          style={{
            height: 48, borderRadius: 12,
            backgroundColor: C.brand,
            color: '#fff', fontSize: 16, fontWeight: 600,
          }}
        >
          시작하기
        </button>
      </div>
    </div>
  )
}

// ─── AI chip row (Step 2) ─────────────────────────────────────────────────────
const PRESET_CHIPS = ['타이포 참고', '그리드 구조', '색상 팔레트', '분위기 참고', '레이아웃']

function ChipRow({ selected, onToggle }: { selected: Set<string>; onToggle: (c: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {PRESET_CHIPS.map(chip => {
        const on = selected.has(chip)
        return (
          <button
            key={chip}
            onClick={() => onToggle(chip)}
            className="flex-shrink-0 transition-colors duration-150"
            style={{
              height: 32, padding: '0 12px', borderRadius: 999,
              fontSize: 12, fontWeight: 500,
              backgroundColor: on ? C.ctxBg : C.inputBg,
              color: on ? C.ctxText : C.sub,
            }}
          >
            {chip}
          </button>
        )
      })}
    </div>
  )
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function Step2({
  onSave,
  onSkip,
}: {
  onSave: (card: Partial<CardData>) => void
  onSkip: () => void
}) {
  const [url, setUrl]                   = useState('')
  const [chips, setChips]               = useState<Set<string>>(new Set())
  const [savedReason, setSavedReason]   = useState('')

  const toggleChip = (chip: string) =>
    setChips(prev => { const n = new Set(prev); n.has(chip) ? n.delete(chip) : n.add(chip); return n })

  const handleSave = () => {
    let source = url.trim()
    try { source = new URL(url).hostname.replace('www.', '') } catch { /* use raw */ }
    onSave({
      title:       `${source} 레퍼런스`,
      source,
      sourceUrl:   url.trim(),
      chips:       Array.from(chips),
      savedReason: savedReason.trim() || undefined,
    })
  }

  const canSave = url.trim().length > 0

  return (
    <div className="relative flex flex-col h-full bg-white">
      {/* Skip */}
      <button
        onClick={onSkip}
        className="absolute right-4 z-10"
        style={{ top: 52, fontSize: 12, color: C.sub }}
      >
        건너뛰기
      </button>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto px-4 pt-12 pb-2">
        <p
          className="uppercase mb-3"
          style={{ fontSize: 10, color: C.stepLabel, letterSpacing: '0.05em' }}
        >
          STEP 2 OF 3
        </p>

        <h2
          className="leading-snug mb-1.5"
          style={{ fontSize: 20, fontWeight: 500, color: C.headline }}
        >
          첫 레퍼런스를 저장해봐요
        </h2>

        <p
          className="whitespace-pre-line leading-relaxed mb-5"
          style={{ fontSize: 13, color: C.sub }}
        >
          {'저장할 때 이유를 남기면\n나중에 더 잘 꺼내줄 수 있어요.'}
        </p>

        {/* URL */}
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="URL을 붙여넣어봐요..."
          className="w-full outline-none mb-4 placeholder:text-[#BEBCB4]"
          style={{
            height: 44, borderRadius: 10, padding: '0 14px',
            backgroundColor: C.inputBg,
            fontSize: 14, color: C.headline,
          }}
        />

        {/* AI chips */}
        <ChipRow selected={chips} onToggle={toggleChip} />

        {/* Context box */}
        <div
          className="mt-4 mb-2"
          style={{ backgroundColor: C.ctxBg, borderRadius: 8, padding: '8px 10px' }}
        >
          <p
            className="uppercase mb-1"
            style={{ fontSize: 10, color: C.ctxLabel, letterSpacing: '0.04em' }}
          >
            저장 이유
          </p>
          <textarea
            value={savedReason}
            onChange={e => setSavedReason(e.target.value)}
            placeholder="왜 저장했는지 한 줄만..."
            rows={2}
            className="w-full outline-none resize-none bg-transparent leading-normal placeholder:opacity-40"
            style={{ fontSize: 12, color: C.ctxText }}
          />
        </div>

        {/* Helper */}
        <p
          className="italic mb-4"
          style={{ fontSize: 11, color: C.helper }}
        >
          저장 이유가 있으면 더 잘 꺼내줄 수 있어요
        </p>
      </div>

      {/* CTA */}
      <div className="px-4 pb-8 pt-3 bg-white">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full transition-opacity duration-150"
          style={{
            height: 48, borderRadius: 12,
            backgroundColor: canSave ? C.brand : '#EBEBF0',
            color: canSave ? '#fff' : C.sub,
            fontSize: 16, fontWeight: 600,
            opacity: canSave ? 1 : 0.6,
          }}
        >
          저장하기
        </button>
      </div>
    </div>
  )
}

// ─── Swipe card ───────────────────────────────────────────────────────────────
interface SwipeCardProps {
  card: Partial<CardData> | null
  forceFly: 'right' | 'left' | null
  onResolved: (dir: 'execute' | 'skip') => void
}

function SwipeCard({ card, forceFly, onResolved }: SwipeCardProps) {
  const [dragX, setDragX]               = useState(0)
  const [isDragging, setIsDragging]     = useState(false)
  const [flyOff, setFlyOff]             = useState<'right' | 'left' | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [imgError, setImgError]         = useState(false)
  const startXRef                       = useRef(0)
  const onResolvedRef                   = useRef(onResolved)
  onResolvedRef.current                 = onResolved

  const THRESHOLD = 80

  // External fly trigger (from buttons)
  useEffect(() => {
    if (!forceFly || flyOff) return
    setFlyOff(forceFly)
    const t = setTimeout(() => {
      onResolvedRef.current(forceFly === 'right' ? 'execute' : 'skip')
    }, 280)
    return () => clearTimeout(t)
  }, [forceFly, flyOff])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (flyOff) return
    setIsDragging(true)
    setHasInteracted(true)
    startXRef.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || flyOff) return
    setDragX(e.clientX - startXRef.current)
  }

  const release = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragX >= THRESHOLD) {
      setFlyOff('right')
      setTimeout(() => onResolvedRef.current('execute'), 280)
    } else if (dragX <= -THRESHOLD) {
      setFlyOff('left')
      setTimeout(() => onResolvedRef.current('skip'), 280)
    } else {
      setDragX(0)
    }
  }

  const absX     = Math.abs(dragX)
  const opacity  = Math.min(absX / THRESHOLD, 1)
  const rotation = dragX * 0.04

  const getTransform = () => {
    if (flyOff === 'right') return 'translateX(520px) rotate(12deg)'
    if (flyOff === 'left')  return 'translateX(-520px) rotate(-12deg)'
    return `translateX(${dragX}px) rotate(${rotation}deg)`
  }

  const getTransition = () => {
    if (flyOff)     return 'transform 280ms ease-out'
    if (isDragging) return 'none'
    return 'transform 300ms cubic-bezier(0.34,1.56,0.64,1)'
  }

  return (
    <div className="relative">
      {/* Inline keyframes — only injected once until user interacts */}
      {!hasInteracted && (
        <style>{`
          @keyframes swipeHint {
            0%,100% { transform: translateX(0); }
            20%     { transform: translateX(24px); }
            50%     { transform: translateX(0); }
            70%     { transform: translateX(-24px); }
          }
        `}</style>
      )}

      {/* Draggable card */}
      <div
        className="relative overflow-hidden bg-white select-none cursor-grab active:cursor-grabbing"
        style={{
          borderRadius: 14,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          transform: getTransform(),
          transition: getTransition(),
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={release}
        onPointerCancel={release}
      >
        {/* Execute overlay (right swipe) */}
        <div
          className="absolute inset-0 flex items-center justify-end pr-5 z-10 pointer-events-none"
          style={{
            borderRadius: 14,
            backgroundColor: 'rgba(106,112,255,0.12)',
            opacity: dragX > 0 ? opacity : 0,
          }}
        >
          <span style={{ color: C.brand, fontSize: 14, fontWeight: 700 }}>실행하기 →</span>
        </div>

        {/* Skip overlay (left swipe) */}
        <div
          className="absolute inset-0 flex items-center justify-start pl-5 z-10 pointer-events-none"
          style={{
            borderRadius: 14,
            backgroundColor: 'rgba(226,75,74,0.10)',
            opacity: dragX < 0 ? opacity : 0,
          }}
        >
          <span style={{ color: C.danger, fontSize: 14, fontWeight: 700 }}>← 건너뜀</span>
        </div>

        {/* Thumbnail */}
        <div
          className="w-full overflow-hidden flex items-center justify-center"
          style={{ height: 120, backgroundColor: C.ctxBg }}
        >
          {card?.imageUrl && !imgError ? (
            <img
              src={card.imageUrl}
              alt={card.title ?? ''}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span style={{ fontSize: 32 }}>🔖</span>
          )}
        </div>

        {/* Card body */}
        <div className="p-4">
          <p
            className="font-bold leading-snug mb-2 line-clamp-2"
            style={{ fontSize: 14, color: C.headline }}
          >
            {card?.title ?? '저장한 레퍼런스'}
          </p>

          {card?.savedReason && (
            <div
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: C.ctxBg }}
            >
              <p
                className="leading-relaxed line-clamp-2"
                style={{ fontSize: 12, color: C.ctxText }}
              >
                {card.savedReason}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Swipe hint (disappears after first interaction) */}
      {!hasInteracted && (
        <div
          className="mt-4 flex justify-center items-center gap-3"
          style={{ animation: 'swipeHint 2s ease-in-out infinite' }}
        >
          <span style={{ fontSize: 11, color: C.sub }}>건너뜀 ←</span>
          <span style={{ fontSize: 20 }}>👆</span>
          <span style={{ fontSize: 11, color: C.sub }}>→ 실행</span>
        </div>
      )}
    </div>
  )
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────
function Step3({ card, onComplete }: { card: Partial<CardData> | null; onComplete: () => void }) {
  const [isDone, setIsDone]   = useState(false)
  const [showCTA, setShowCTA] = useState(false)
  const [forceFly, setForceFly] = useState<'right' | 'left' | null>(null)

  const handleResolved = (_dir: 'execute' | 'skip') => {
    setIsDone(true)
    setTimeout(() => setShowCTA(true), 1000)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto px-4 pt-12 pb-2">
        <p
          className="uppercase mb-3"
          style={{ fontSize: 10, color: C.stepLabel, letterSpacing: '0.05em' }}
        >
          STEP 3 OF 3
        </p>

        {!isDone ? (
          <>
            <h2
              className="leading-snug mb-1.5"
              style={{ fontSize: 20, fontWeight: 500, color: C.headline }}
            >
              이렇게 꺼내줄게요
            </h2>

            <p
              className="whitespace-pre-line leading-relaxed mb-6"
              style={{ fontSize: 13, color: C.sub }}
            >
              {'저장한 레퍼런스를 스와이프해서\n실행하거나 건너뛸 수 있어요.'}
            </p>

            <SwipeCard card={card} forceFly={forceFly} onResolved={handleResolved} />
          </>
        ) : (
          /* Completion message */
          <div className="flex flex-col items-center justify-center pt-12 text-center">
            <div
              className="flex items-center justify-center mb-5"
              style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.ctxBg }}
            >
              <span style={{ fontSize: 30 }}>✨</span>
            </div>
            <h2
              className="leading-snug mb-2"
              style={{ fontSize: 20, fontWeight: 500, color: C.headline }}
            >
              완벽해요!
            </h2>
            <p style={{ fontSize: 14, color: C.sub }}>이제 ReDo를 시작해봐요</p>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      {!isDone ? (
        <div className="flex gap-2 px-4 pb-8 pt-3 bg-white">
          <button
            onClick={() => setForceFly('left')}
            style={{
              flex: 1, height: 48, borderRadius: 12,
              backgroundColor: C.inputBg,
              color: C.sub, fontSize: 15, fontWeight: 500,
            }}
          >
            건너뜀
          </button>
          <button
            onClick={() => setForceFly('right')}
            style={{
              flex: 2, height: 48, borderRadius: 12,
              backgroundColor: C.brand,
              color: '#fff', fontSize: 15, fontWeight: 600,
            }}
          >
            실행하기
          </button>
        </div>
      ) : (
        <div
          className="px-4 pb-8 pt-3 bg-white transition-opacity duration-300"
          style={{ opacity: showCTA ? 1 : 0 }}
        >
          <button
            onClick={onComplete}
            disabled={!showCTA}
            className="w-full"
            style={{
              height: 48, borderRadius: 12,
              backgroundColor: C.brand,
              color: '#fff', fontSize: 16, fontWeight: 600,
            }}
          >
            ReDo 시작하기
          </button>
        </div>
      )}
    </div>
  )
}

// ─── OnboardingScreen ─────────────────────────────────────────────────────────
export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep]           = useState(0)
  const [savedCard, setSavedCard] = useState<Partial<CardData> | null>(null)

  const PCT = [33, 66, 100]

  const handleSave = (card: Partial<CardData>) => {
    setSavedCard(card)
    setStep(2)
  }

  return (
    <div
      className="relative overflow-hidden bg-white"
      style={{ maxWidth: 375, margin: '0 auto', height: '100svh' }}
    >
      {/* Progress bar — above slides */}
      <ProgressBar pct={PCT[step]} />

      {/* Slide deck: each step is absolute, offset by (i - step) * 100% */}
      {([0, 1, 2] as const).map(i => (
        <div
          key={i}
          className="absolute inset-0 transition-transform duration-[280ms] ease-out"
          style={{ transform: `translateX(${(i - step) * 100}%)` }}
          aria-hidden={i !== step}
        >
          {i === 0 && <Step1 onNext={() => setStep(1)} onSkip={onComplete} />}
          {i === 1 && <Step2 onSave={handleSave} onSkip={onComplete} />}
          {i === 2 && <Step3 card={savedCard} onComplete={onComplete} />}
        </div>
      ))}
    </div>
  )
}

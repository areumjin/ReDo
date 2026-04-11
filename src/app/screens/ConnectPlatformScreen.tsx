import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/components/ui/utils'

interface ConnectPlatformScreenProps {
  onComplete: () => void
}

const PLATFORMS = [
  { id: 'behance', name: 'Behance', color: '#1769FF', initial: 'Be' },
  { id: 'pinterest', name: 'Pinterest', color: '#E60023', initial: 'P' },
  { id: 'dribbble', name: 'Dribbble', color: '#EA4C89', initial: 'Dr' },
  { id: 'instagram', name: 'Instagram', color: '#C13584', initial: 'In' },
  { id: 'figma', name: 'Figma Community', color: '#F24E1E', initial: 'Fi' },
  { id: 'awwwards', name: 'Awwwards', color: '#1A1A1A', initial: 'Aw' },
]

export default function ConnectPlatformScreen({ onComplete }: ConnectPlatformScreenProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-page" style={{ maxWidth: 375, margin: '0 auto' }}>
      {/* Header */}
      <div className="px-6 pt-16 pb-8">
        <h1 className="text-[26px] font-bold text-text-primary leading-snug tracking-tight mb-2">
          어디서 레퍼런스를<br />수집하시나요?
        </h1>
        <p className="text-[14px] text-text-secondary">
          나중에 설정에서 언제든 변경할 수 있어요.
        </p>
      </div>

      {/* Platform list */}
      <div className="flex-1 px-6 space-y-3">
        {PLATFORMS.map(platform => {
          const isSelected = selected.has(platform.id)
          return (
            <button
              key={platform.id}
              onClick={() => toggle(platform.id)}
              className={cn(
                'w-full flex items-center gap-4 px-4 h-[60px] rounded-2xl border transition-all duration-150',
                isSelected
                  ? 'border-brand bg-brand-tint'
                  : 'border-border bg-card'
              )}
            >
              {/* Logo placeholder */}
              <div
                className="size-9 rounded-xl flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                style={{ backgroundColor: platform.color }}
              >
                {platform.initial}
              </div>

              <span className={cn(
                'flex-1 text-left text-[15px] font-medium',
                isSelected ? 'text-brand' : 'text-text-primary'
              )}>
                {platform.name}
              </span>

              <div className={cn(
                'size-5 rounded-full border-2 flex items-center justify-center transition-colors duration-150',
                isSelected ? 'border-brand bg-brand' : 'border-surface-muted'
              )}>
                {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Bottom */}
      <div className="px-6 pb-12 pt-6 space-y-3">
        <button
          onClick={onComplete}
          className="w-full h-14 rounded-2xl bg-brand text-white text-[16px] font-semibold"
        >
          {selected.size > 0 ? `${selected.size}개 연동하기` : '연동하기'}
        </button>
        <button
          onClick={onComplete}
          className="w-full h-11 text-[14px] text-text-tertiary"
        >
          나중에 설정할게요
        </button>
      </div>
    </div>
  )
}

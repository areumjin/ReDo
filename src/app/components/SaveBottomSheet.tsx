import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/components/ui/utils'

interface SaveData {
  title: string
  url: string
  savedReason: string
  projectTag: string
  chips: string[]
  imageUrl: string | null
}

interface SaveBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: SaveData) => void
}

const PROJECT_TAGS = ['졸업전시', '브랜딩 과제', '개인 프로젝트', '기타']

export default function SaveBottomSheet({ isOpen, onClose, onSave }: SaveBottomSheetProps) {
  const [url, setUrl] = useState('')
  const [reason, setReason] = useState('')
  const [projectTag, setProjectTag] = useState('기타')

  const handleSave = () => {
    if (!url.trim()) return

    let title = url.trim()
    try { title = new URL(url).hostname.replace('www.', '') + ' 레퍼런스' } catch { /* use raw */ }

    onSave({
      title,
      url: url.trim(),
      savedReason: reason.trim(),
      projectTag,
      chips: [],
      imageUrl: null,
    })

    setUrl('')
    setReason('')
    setProjectTag('기타')
    onClose()
  }

  const canSave = url.trim().length > 0

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full bg-card rounded-t-3xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ maxWidth: 375 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-surface-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-[18px] font-bold text-text-primary">레퍼런스 저장</h2>
          <button
            onClick={onClose}
            className="size-11 rounded-lg flex items-center justify-center text-icon-default"
          >
            <X className="size-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 space-y-3 pb-4">
          {/* URL input */}
          <div>
            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave() }}
              placeholder="https://"
              className="w-full h-12 px-4 rounded-xl bg-input-background text-[14px] text-text-primary placeholder:text-text-disabled outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {/* Project tag */}
          <div>
            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
              프로젝트
            </label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {PROJECT_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setProjectTag(tag)}
                  className={cn(
                    'flex-shrink-0 h-8 px-3.5 rounded-full text-[12px] font-medium transition-colors duration-150',
                    projectTag === tag
                      ? 'bg-brand-tint text-brand'
                      : 'bg-surface-subtle text-text-secondary'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Reason input — Context box style */}
          <div>
            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
              저장 이유 <span className="text-text-disabled font-normal">(선택)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="왜 저장했는지 한 줄로 남겨두세요"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-[14px] placeholder:text-text-disabled outline-none focus:ring-2 resize-none leading-normal"
              style={{
                backgroundColor: 'var(--context-box-bg)',
                color: reason ? 'var(--context-box-text)' : undefined,
              }}
            />
          </div>
        </div>

        {/* Action */}
        <div className="px-6 pb-8">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              'w-full h-14 rounded-2xl text-[16px] font-semibold transition-opacity duration-150',
              canSave
                ? 'bg-brand text-white'
                : 'bg-surface-muted text-text-disabled cursor-not-allowed'
            )}
          >
            저장하기
          </button>
        </div>

        <div className="pb-safe" />
      </div>
    </>
  )
}

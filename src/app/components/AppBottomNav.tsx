import { Home, Bookmark, Plus, Zap, Clock } from 'lucide-react'
import { cn } from '@/components/ui/utils'

interface AppBottomNavProps {
  currentTab: 'home' | 'action'
  onTabChange: (tab: 'home' | 'action') => void
  onFabPress: () => void
}

interface NavItemProps {
  icon: React.ElementType
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}

function NavItem({ icon: Icon, label, active, disabled, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 h-full w-full transition-colors duration-150',
        active && 'text-brand',
        !active && !disabled && 'text-text-tertiary',
        disabled && 'text-text-disabled cursor-not-allowed opacity-40'
      )}
    >
      <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
      <span className={cn(
        'text-[10px]',
        active ? 'font-semibold' : 'font-medium'
      )}>
        {label}
      </span>
    </button>
  )
}

export default function AppBottomNav({ currentTab, onTabChange, onFabPress }: AppBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-card border-t border-border"
      style={{ maxWidth: 375 }}
    >
      <div className="grid grid-cols-5 h-16">
        {/* 홈 */}
        <NavItem
          icon={Home}
          label="홈"
          active={currentTab === 'home'}
          onClick={() => onTabChange('home')}
        />

        {/* 보관 — Phase 2 */}
        <NavItem
          icon={Bookmark}
          label="보관"
          disabled
        />

        {/* FAB */}
        <div className="flex items-center justify-center">
          <button
            onClick={onFabPress}
            className="size-11 rounded-full bg-brand flex items-center justify-center active:scale-95 transition-transform duration-100"
            style={{ boxShadow: '0 4px 12px rgba(106, 112, 255, 0.35)' }}
            aria-label="레퍼런스 저장"
          >
            <Plus className="size-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* 활용 */}
        <NavItem
          icon={Zap}
          label="활용"
          active={currentTab === 'action'}
          onClick={() => onTabChange('action')}
        />

        {/* 기록 — Phase 2 */}
        <NavItem
          icon={Clock}
          label="기록"
          disabled
        />
      </div>

      {/* Safe area */}
      <div className="pb-safe" />
    </nav>
  )
}

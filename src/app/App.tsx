import { useState, useEffect, useCallback } from 'react'
import { CardData } from '@/types'
import { mockCards } from '@/data/mockCards'
import OnboardingScreen from './screens/OnboardingScreen'
import ConnectPlatformScreen from './screens/ConnectPlatformScreen'
import HomeScreen from './screens/HomeScreen'
import ActionScreen from './screens/ActionScreen'
import AppBottomNav from './components/AppBottomNav'
import DetailScreen from './components/DetailScreen'
import SaveBottomSheet from './components/SaveBottomSheet'

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl bg-text-primary text-white text-[14px] font-medium shadow-elevated animate-in fade-in slide-in-from-bottom-4 duration-200"
      style={{ bottom: 96, maxWidth: 340 }}
    >
      {message}
    </div>
  )
}

// ─── Routing ────────────────────────────────────────────────────────────────
type AppScreen = 'onboarding' | 'connect' | 'main'

function getInitialScreen(): AppScreen {
  const params = new URLSearchParams(window.location.search)
  if (params.get('onboarding') === 'true') return 'onboarding'
  return localStorage.getItem('redo_onboarded') ? 'main' : 'onboarding'
}

// ─── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<AppScreen>(getInitialScreen)
  const [cards, setCards] = useState<CardData[]>(mockCards)
  const [currentTab, setCurrentTab] = useState<'home' | 'action'>('home')
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [executedCardIds, setExecutedCardIds] = useState<Set<number>>(new Set())
  const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => setToast(msg), [])
  const clearToast = useCallback(() => setToast(null), [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOnboardingComplete = () => setScreen('connect')

  const handleConnectComplete = () => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('onboarding') !== 'true') {
      localStorage.setItem('redo_onboarded', 'true')
    }
    setScreen('main')
  }

  // [1] Toggle execute — 실행/취소 가능
  const handleExecute = (id: number) => {
    setExecutedCardIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        showToast('실행 취소했어요')
      } else {
        next.add(id)
        showToast('실행 완료! 잘했어요 🎉')
      }
      return next
    })
  }

  // [2] Save from bottom sheet
  const handleSave = (data: { title: string; url: string; savedReason: string; projectTag: string; chips: string[]; imageUrl: string | null }) => {
    const newCard: CardData = {
      id: Date.now(),
      title: data.title || '새 레퍼런스',
      source: 'manual',
      sourceUrl: data.url,
      imageUrl: data.imageUrl || undefined,
      chips: data.chips,
      projectTag: data.projectTag || '기타',
      savedAt: '오늘',
      savedReason: data.savedReason || undefined,
      status: 'pending',
    }
    setCards(prev => [newCard, ...prev])
    showToast('레퍼런스가 저장되었어요')
  }

  // ── Non-main screens ───────────────────────────────────────────────────────
  if (screen === 'onboarding') {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />
  }

  if (screen === 'connect') {
    return <ConnectPlatformScreen onComplete={handleConnectComplete} />
  }

  // ── Main app ───────────────────────────────────────────────────────────────
  return (
    <div
      className="relative flex flex-col min-h-screen bg-surface-page overflow-hidden"
      style={{ maxWidth: 375, margin: '0 auto' }}
    >
      {/* Scrollable content area — padded above bottom nav */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 64 }}>
        {currentTab === 'home' && (
          <HomeScreen
            cards={cards}
            onCardSelect={setSelectedCard}
          />
        )}
        {currentTab === 'action' && (
          <ActionScreen
            cards={cards}
            executedCardIds={executedCardIds}
            onExecute={handleExecute}
            onCardSelect={setSelectedCard}
          />
        )}
      </main>

      {/* Bottom navigation with FAB */}
      <AppBottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onFabPress={() => setIsSaveSheetOpen(true)}
        onDisabledTab={() => showToast('곧 추가될 기능이에요 🛠️')}
      />

      {/* Detail screen — slides in from right */}
      <DetailScreen
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />

      {/* Save bottom sheet — slides up */}
      <SaveBottomSheet
        isOpen={isSaveSheetOpen}
        onClose={() => setIsSaveSheetOpen(false)}
        onSave={handleSave}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  )
}

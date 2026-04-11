import { useState } from 'react'
import { CardData } from '@/types'
import { mockCards } from '@/data/mockCards'
import OnboardingScreen from './screens/OnboardingScreen'
import ConnectPlatformScreen from './screens/ConnectPlatformScreen'
import HomeScreen from './screens/HomeScreen'
import ActionScreen from './screens/ActionScreen'
import AppBottomNav from './components/AppBottomNav'
import DetailScreen from './components/DetailScreen'
import SaveBottomSheet from './components/SaveBottomSheet'

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
  const [cards] = useState<CardData[]>(mockCards)   // setter는 저장 기능 구현 시 추가
  const [currentTab, setCurrentTab] = useState<'home' | 'action'>('home')
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [executedCardIds, setExecutedCardIds] = useState<Set<number>>(new Set())
  const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOnboardingComplete = () => setScreen('connect')

  const handleConnectComplete = () => {
    // ?onboarding=true 파라미터가 있으면 localStorage 저장 안 함 (데모/테스트 용도)
    const params = new URLSearchParams(window.location.search)
    if (params.get('onboarding') !== 'true') {
      localStorage.setItem('redo_onboarded', 'true')
    }
    setScreen('main')
  }

  const handleExecute = (id: number) => {
    setExecutedCardIds(prev => new Set([...prev, id]))
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
      />
    </div>
  )
}

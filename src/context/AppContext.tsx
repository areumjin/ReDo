// ─── App Context ─────────────────────────────────────────────────────────────
// App 전체에서 공유하는 핵심 상태와 함수들을 Context로 제공합니다.
// HomeScreen, ActionScreen, WorkbenchScreen 등에서 useAppContext()로 접근합니다.

import { createContext, useContext, type ReactNode } from "react";
import type { CardData } from "../types";
import type { ToastConfig } from "../components/Toast";

// ─── ActiveTab — 단일 정의 (App, BottomNav, SideNav 모두 여기서 import) ──────
export type ActiveTab = "홈" | "보관" | "활용" | "기록" | "작업대";

// ─── Context 값 인터페이스 ────────────────────────────────────────────────────
export interface AppContextValue {
  // ── 상태 ──
  cards: CardData[];
  setCards: React.Dispatch<React.SetStateAction<CardData[]>>;
  executedCardIds: Set<number>;
  setExecutedCardIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  currentTab: ActiveTab;
  selectedCard: CardData | null;
  isSaveSheetOpen: boolean;
  isMemoSheetOpen: boolean;
  memoTargetCard: CardData | null;

  // ── 세터 ──
  setCurrentTab: (tab: ActiveTab) => void;
  setSelectedCard: (card: CardData | null) => void;
  setIsSaveSheetOpen: (open: boolean) => void;
  setIsMemoSheetOpen: (open: boolean) => void;
  setMemoTargetCard: (card: CardData | null) => void;

  // ── 핸들러 ──
  handleExecuteCard: (id: number) => void;
  handleMemoComplete: (memo: string) => void;
  handleMemoSkip: () => void;
  showToast: (cfg: ToastConfig) => void;
}

// ─── Context 생성 ─────────────────────────────────────────────────────────────
const AppContext = createContext<AppContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within <AppProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AppContextValue;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

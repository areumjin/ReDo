import { useState, useRef, useCallback, useEffect, Component, type ErrorInfo, type ReactNode } from "react";
import { AppProvider, type ActiveTab, type AppContextValue } from "./context/AppContext";
import { detectContentType } from "./utils/importParser";

// ─── Error Boundary ────────────────────────────────────────────────────────────
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ReDo ErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 24,
            background: "#fff", gap: 16, fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>
            오류가 발생했습니다
          </h2>
          <p style={{ fontSize: 13, color: "#888", textAlign: "center", margin: 0 }}>
            {this.state.error?.message ?? "알 수 없는 오류"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px", background: "#6A70FF", color: "#fff",
              border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { HomeScreen } from "./screens/HomeScreen";
import { ActionScreen } from "./screens/ActionScreen";
import { ArchiveScreen } from "./screens/ArchiveScreen";
import type { PendingCardData } from "./screens/ArchiveScreen";
import { InsightsScreen } from "./screens/InsightsScreen";
import { DetailScreen } from "./screens/DetailScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { SaveBottomSheet } from "./components/SaveBottomSheet";
import { ExecutionMemoSheet } from "./components/ExecutionMemoSheet";
import { CardEditSheet } from "./components/CardEditSheet";
import { AIRecommendScreen } from "./screens/AIRecommendScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ImportScreen } from "./screens/ImportScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { NFCTriggerScreen } from "./screens/NFCTriggerScreen";
import { ContextRecommendScreen } from "./screens/ContextRecommendScreen";
import { StationStatusScreen } from "./screens/StationStatusScreen";
import { StationPairingScreen } from "./screens/StationPairingScreen";
import { CompletionScreen } from "./screens/CompletionScreen";
import { useToast } from "./components/Toast";
import { type CardData, ALL_CARDS } from "./types";
import { SEED_CARDS } from "./data/seedCards";
import { getCurrentUser, onAuthStateChange, signOut } from "./lib/auth";
import { getCards, saveCard, deleteCard } from "./lib/cardService";
import { supabase } from "./lib/supabase";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { SideNav } from "./components/SideNav";

// ActiveTab은 AppContext에서 import (단일 정의)

const BACK_LABELS: Record<ActiveTab, string> = {
  홈: "홈",
  보관: "보관함",
  활용: "활용",
  기록: "기록",
};

// ─── Onboarding gating ────────────────────────────────────────────────────────

const searchParams = new URLSearchParams(window.location.search);
const forceOnboarding = searchParams.get("onboarding") === "true";
const isAlreadyOnboarded =
  !forceOnboarding && localStorage.getItem("redo_onboarded") === "true";

// ─── PWA Share Target params ──────────────────────────────────────────────────
// Level 1 (GET): URL 파라미터로 전달 (구형 브라우저 호환)
const sharedUrl = searchParams.get("url") ?? searchParams.get("text") ?? null;
const sharedTitle = searchParams.get("title") ?? null;
// Level 2 (POST): 서비스 워커가 캐시에 저장 후 ?fromShare=1 로 리다이렉트
const fromShareCache = searchParams.get("fromShare") === "1";
const isFromShare = !!(sharedUrl) || fromShareCache;

// ─── NFC Trigger param ───────────────────────────────────────────────────────
const isNFCFromUrl = searchParams.get("nfc") === "true";

// ─── Context Recommend param ─────────────────────────────────────────────────
const isContextFromUrl = searchParams.get("context") === "true";

// URL 파라미터를 즉시 제거 — 뒤로가기 시 바텀시트가 다시 열리지 않도록
if (sharedUrl || fromShareCache || isNFCFromUrl || isContextFromUrl) {
  window.history.replaceState({}, "", "/");
}

type AppScreen = "loading" | "login" | "onboarding" | "main";

// ─── Skeleton card placeholder ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        background: "#F0F0F0",
        animation: "shimmer 1.4s ease-in-out infinite",
      }}
    >
      <div style={{ height: 140, background: "#E8E8E8" }} />
      <div style={{ padding: "8px 10px" }}>
        <div style={{ height: 10, background: "#DCDCDC", borderRadius: 4, marginBottom: 6, width: "60%" }} />
        <div style={{ height: 10, background: "#DCDCDC", borderRadius: 4, width: "90%" }} />
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("홈");
  const [detailVisible, setDetailVisible] = useState(false);
  const [returnTab, setReturnTab] = useState<ActiveTab>("홈");
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetInitialUrl, setSheetInitialUrl] = useState<string | undefined>(undefined);
  const [sheetInitialTitle, setSheetInitialTitle] = useState<string | undefined>(undefined);
  const [aiRecommendVisible, setAiRecommendVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [sheetInitialImageUrl, setSheetInitialImageUrl] = useState<string | undefined>(undefined);

  // ── NFC Trigger state ─────────────────────────────────────────────────────
  const [isNFCTriggered, setIsNFCTriggered] = useState(isNFCFromUrl);

  // ── Context Recommend state ─────────────────────────────────────────────
  const [isContextMode, setIsContextMode] = useState(isContextFromUrl);

  // ── Station Status state ──────────────────────────────────────────────
  const [isStationStatusOpen, setIsStationStatusOpen] = useState(false);

  // ── Completion Screen state ────────────────────────────────────────────
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [completionStats, setCompletionStats] = useState({ executed: 0, skipped: 0 });

  // ── Station Pairing state (최초 NFC 감지 시 1회만) ────────────────────
  const [isStationPairing, setIsStationPairing] = useState(() => {
    // NFC 트리거로 들어왔는데 아직 페어링 안 된 경우
    return isNFCFromUrl && localStorage.getItem("redo_station_paired") !== "true";
  });

  // ── App screen state ──────────────────────────────────────────────────────
  const [appScreen, setAppScreen] = useState<AppScreen>("loading");
  const [onboardingKey, setOnboardingKey] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // ── Cards loading state ───────────────────────────────────────────────────
  const [cardsLoading, setCardsLoading] = useState(false);

  // ── SW 자동 업데이트: 새 버전 배포 시 자동 리로드 ────────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handleControllerChange = () => {
      // 새 서비스 워커가 활성화되면 페이지 새로고침 (무한루프 방지: 한 번만)
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  // ── Toast — declared early so useEffects below can reference showToast ───
  const { showToast, ToastNode } = useToast();
  const { isMobile, isDesktop } = useBreakpoint();

  // ── Auth initialization ───────────────────────────────────────────────────
  useEffect(() => {
    const goToScreen = (screen: AppScreen) => setAppScreen(screen);

    // If supabase is not configured, go directly to onboarding or main
    if (!supabase) {
      if (forceOnboarding || !isAlreadyOnboarded) {
        goToScreen("onboarding");
      } else {
        goToScreen("main");
      }
      return;
    }

    // Safety timeout — if auth check hangs for 5s, fall back to login
    const timeout = setTimeout(() => {
      setAppScreen((prev) => prev === "loading" ? "login" : prev);
    }, 5000);

    // Check current session
    getCurrentUser()
      .then(async (user) => {
        clearTimeout(timeout);
        if (user) {
          setCurrentUserId(user.id);
          setCurrentUserEmail(user.email ?? null);
          if (forceOnboarding) {
            goToScreen("onboarding");
          } else if (isAlreadyOnboarded) {
            goToScreen("main");
            loadCardsFromSupabase();
          } else {
            // localStorage에 온보딩 기록이 없더라도,
            // Supabase에 카드가 있으면 기존 유저 → 온보딩 스킵
            try {
              const existingCards = await getCards();
              if (existingCards.length > 0) {
                localStorage.setItem("redo_onboarded", "true");
                setCards(existingCards);
                goToScreen("main");
              } else {
                goToScreen("onboarding");
              }
            } catch {
              goToScreen("onboarding");
            }
          }
        } else {
          goToScreen("login");
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        // Auth error → show login screen as fallback
        goToScreen("login");
      });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email ?? null);
      } else {
        setCurrentUserId(null);
        setCurrentUserEmail(null);
      }
    });

    return unsubscribe;
  }, []);

  // Load cards from Supabase
  const loadCardsFromSupabase = useCallback(async () => {
    if (!supabase) return;
    setCardsLoading(true);
    try {
      const remoteCards = await getCards();
      if (remoteCards.length > 0) {
        setCards(remoteCards);
      }
      // If empty, keep mockCards (ALL_CARDS) as fallback
    } finally {
      setCardsLoading(false);
    }
  }, []);

  // ── PWA Share Target — open sheet with shared data ────────────────────────
  useEffect(() => {
    if (appScreen !== "main") return;

    // Level 1: GET 방식 (URL 파라미터)
    if (sharedUrl) {
      setSheetInitialUrl(sharedUrl);
      setSheetInitialTitle(sharedTitle ?? undefined);
      setSheetOpen(true);
      return;
    }

    // Level 2: POST 방식 (서비스 워커가 캐시에 저장한 데이터)
    if (fromShareCache) {
      (async () => {
        try {
          const cache = await caches.open("redo-share-v1");

          // 메타데이터 읽기
          const metaRes = await cache.match("/redo-share-meta");
          if (!metaRes) return;
          const meta = await metaRes.json() as {
            title: string; text: string; url: string; hasImage: boolean;
          };

          setSheetInitialUrl(meta.url || meta.text || "");
          setSheetInitialTitle(meta.title || "");

          // 이미지 파일 읽기
          if (meta.hasImage) {
            const imgRes = await cache.match("/redo-share-image");
            if (imgRes) {
              const blob = await imgRes.blob();
              const objectUrl = URL.createObjectURL(blob);
              setSheetInitialImageUrl(objectUrl);
            }
          }

          // 캐시 정리
          await cache.delete("/redo-share-meta");
          await cache.delete("/redo-share-image");
        } catch (err) {
          console.error("[App] Share cache read error:", err);
        } finally {
          setSheetOpen(true);
        }
      })();
    }
  // Only run once when main screen becomes available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appScreen]);

  // ── Clipboard URL detection (visibility change) ────────────────────────────
  useEffect(() => {
    if (appScreen !== "main") return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const text = await navigator.clipboard.readText();
        const trimmed = text.trim();
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return;
        // Only show toast if it looks like a full URL
        try { new URL(trimmed); } catch { return; }

        showToast({
          variant: "info",
          sourceChip: "클립보드에 URL이 있어요! 탭해서 저장하기",
        });

        // We show a custom toast message — override with a click handler
        // Since useToast doesn't support custom actions, show a simpler approach:
        // The user can open the sheet manually after seeing the toast
        // For full auto-open behavior, we store URL in state
        setSheetInitialUrl(trimmed);
        setSheetInitialTitle(undefined);
      } catch {
        // clipboard permission denied or unavailable
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [appScreen, showToast]);

  // ── Onboarding handlers ───────────────────────────────────────────────────
  const handleOnboardingComplete = () => {
    setTimeout(() => {
      // 온보딩 완료 후 항상 메인으로 이동
      // 로그인된 유저면 Supabase에서 카드 로드, 게스트면 로컬 카드 사용
      setAppScreen("main");
      if (currentUserId) loadCardsFromSupabase();
    }, 320);
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLoginSuccess = async (userId: string) => {
    setCurrentUserId(userId);
    if (forceOnboarding) {
      setOnboardingKey((k) => k + 1);
      setAppScreen("onboarding");
    } else if (isAlreadyOnboarded) {
      setAppScreen("main");
      loadCardsFromSupabase();
    } else {
      // localStorage 기록 없어도 기존 카드 있으면 온보딩 스킵
      try {
        const existingCards = await getCards();
        if (existingCards.length > 0) {
          localStorage.setItem("redo_onboarded", "true");
          setCards(existingCards);
          setAppScreen("main");
        } else {
          setOnboardingKey((k) => k + 1);
          setAppScreen("onboarding");
        }
      } catch {
        setOnboardingKey((k) => k + 1);
        setAppScreen("onboarding");
      }
    }
  };

  const handleGuestMode = () => {
    if (forceOnboarding || !isAlreadyOnboarded) {
      setOnboardingKey((k) => k + 1);
      setAppScreen("onboarding");
    } else {
      setAppScreen("main");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentUserId(null);
    setCurrentUserEmail(null);
    setCards([...SEED_CARDS, ...ALL_CARDS]);
    setAppScreen("login");
  };

  // ── Derive display name from email ────────────────────────────────────────
  const userName = currentUserEmail
    ? (() => {
        const prefix = currentUserEmail.split("@")[0];
        // Capitalize first letter, replace dots/underscores with space
        return prefix.replace(/[._]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
      })()
    : null;

  // Cards state — SEED_CARDS로 시작 (첫 실행부터 데이터 있는 상태)
  const [cards, setCards] = useState<CardData[]>([...SEED_CARDS, ...ALL_CARDS]);

  // ── Folder colors — maps project tag name to a hex color ─────────────────
  const [folderColors, setFolderColors] = useState<Record<string, string>>({
    "영감": "#6A70FF",
    "작업": "#22C55E",
    "학습": "#F59E0B",
    "아이디어": "#EC4899",
    "기타": "#94A3B8",
  });

  const handleFolderColorChange = useCallback((name: string, color: string) => {
    setFolderColors((prev) => ({ ...prev, [name]: color }));
  }, []);

  // ── Existing project tags from current cards ──────────────────────────────
  const existingProjects = Array.from(new Set(cards.map((c) => c.projectTag)));

  const handleEditCard = useCallback((id: number, updated: Partial<CardData>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  }, []);

  const handleDeleteCard = useCallback((card: CardData) => {
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setEditSheetOpen(false);
    setDetailVisible(false); // 디테일 화면도 닫아서 이전 탭으로 복귀
    // Supabase에서도 삭제
    if (card.supabaseId) {
      deleteCard(card.supabaseId).catch(console.error);
    }
  }, []);

  // Global executed card IDs — persists across tab switches within the session
  const [executedCardIds, setExecutedCardIds] = useState<Set<number>>(new Set());

  // Execution memo sheet state
  const [memoSheetOpen, setMemoSheetOpen] = useState(false);
  const [memoTargetCard, setMemoTargetCard] = useState<CardData | null>(null);

  // Card edit sheet state
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editTargetCard, setEditTargetCard] = useState<CardData | null>(null);

  const handleOpenEdit = useCallback((card: CardData) => {
    setEditTargetCard(card);
    setEditSheetOpen(true);
  }, []);

  // "나중에" — temporarily dimmed card IDs (auto-cleared after 3 s)
  const [laterCardIds, setLaterCardIds] = useState<Set<number>>(new Set());

  const handleLaterCard = useCallback((id: number) => {
    setLaterCardIds((prev) => new Set([...prev, id]));
    showToast({ variant: "later", sourceChip: "" });
    setTimeout(() => {
      setLaterCardIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 3000);
  }, [showToast]);

  // Opens memo sheet instead of completing immediately
  const handleExecuteCard = useCallback((id: number) => {
    const card = cards.find((c) => c.id === id) ?? null;
    setMemoTargetCard(card);
    setMemoSheetOpen(true);
  }, [cards]);

  // Called when user taps "저장하고 완료" (with or without memo text)
  const handleMemoComplete = useCallback((memo: string) => {
    if (memoTargetCard) {
      setExecutedCardIds((prev) => new Set([...prev, memoTargetCard.id]));
      if (memo) {
        console.log(`[실행 메모] card#${memoTargetCard.id}:`, memo);
      }
    }
    setMemoSheetOpen(false);
    showToast({ variant: "success", sourceChip: "실행 완료! 잘했어요 🎉" });
  }, [memoTargetCard, showToast]);

  // Called when user taps "건너뛰기" — completes without memo
  const handleMemoSkip = useCallback(() => {
    if (memoTargetCard) {
      setExecutedCardIds((prev) => new Set([...prev, memoTargetCard.id]));
    }
    setMemoSheetOpen(false);
    showToast({ variant: "success", sourceChip: "실행 완료! 잘했어요 🎉" });
  }, [memoTargetCard, showToast]);

  // Track saved URLs for duplicate detection
  const savedUrls = useRef<Set<string>>(new Set());

  // Optimistic card state for 보관 탭
  const [pendingCard, setPendingCard] = useState<PendingCardData | null>(null);
  const [pendingStatus, setPendingStatus] = useState<"saving" | "confirmed" | "failed" | null>(null);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setDetailVisible(false);
  };

  const handleOpenDetail = (card: CardData) => {
    setSelectedCard(card);
    setReturnTab(activeTab);
    setDetailVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailVisible(false);
  };

  const handleRelatedTap = (card: CardData) => {
    setDetailVisible(false);
    requestAnimationFrame(() => {
      setSelectedCard(card);
      setDetailVisible(true);
    });
  };

  const slideTransform = detailVisible ? "translateX(0)" : "translateX(100%)";
  const slideTransition = detailVisible
    ? "transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
    : "transform 250ms cubic-bezier(0.55, 0.0, 1.0, 0.45)";

  const handleOptimisticSave = ({
    projectTag,
    image,
    title,
    urlValue: _urlValue,
  }: {
    projectTag: string;
    image: string | null;
    title: string;
    urlValue: string;
  }) => {
    setPendingCard({
      id: Date.now(),
      image,
      project: projectTag,
      title: title || "새 레퍼런스",
    });
    setPendingStatus("saving");
  };

  const handleSave = async ({
    projectTag,
    urlValue,
    title,
    savedReason,
    imageUrl,
    chips,
    source,
    deadline,
  }: {
    projectTag: string;
    urlValue: string;
    title?: string;
    savedReason?: string;
    imageUrl?: string | null;
    chips?: string[];
    source?: string;
    deadline?: string;
  }) => {
    setTimeout(async () => {
      const normalizedUrl = urlValue.trim().toLowerCase();
      const isDuplicate =
        normalizedUrl.length > 0 && savedUrls.current.has(normalizedUrl);

      if (isDuplicate) {
        setPendingStatus("failed");
        showToast({ variant: "duplicate", sourceChip: projectTag });
        setTimeout(() => {
          setPendingCard(null);
          setPendingStatus(null);
        }, 1200);
      } else {
        if (normalizedUrl.length > 0) savedUrls.current.add(normalizedUrl);

        const newCard: CardData = {
          id: Date.now(),
          title: title || "새 레퍼런스",
          image: imageUrl || "",
          projectTag,
          savedReason: savedReason || "",
          chips: chips || [],
          source: source || "",
          statusDot: "미실행",
          daysAgo: "방금 전",
          processingStatus: "processing",
          contentType: detectContentType(urlValue),
          urlValue: urlValue || "",
          deadline: deadline || undefined,
        };
        setCards((prev) => [newCard, ...prev]);
        setPendingStatus("confirmed");
        showToast({ variant: "success", sourceChip: projectTag });

        // Simulate async AI processing → update to "processed" after a delay
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === newCard.id
                ? { ...c, processingStatus: "processed" as const }
                : c
            )
          );
        }, 5000);

        // Supabase에도 저장 (supabase가 설정된 경우)
        if (supabase && currentUserId) {
          const saved = await saveCard({
            ...newCard,
            urlValue,
            userId: currentUserId,
          });
          if (saved) {
            // Replace local temp ID with Supabase ID
            setCards((prev) =>
              prev.map((c) => (c.id === newCard.id ? { ...c, supabaseId: saved.supabaseId } : c))
            );
          }
        }
      }
    }, 200);
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (appScreen === "loading") {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          height: "100dvh",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: "#6A70FF",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>Re</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#6A70FF",
                animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── AppContext value (PROMPT 6) — 화면 렌더 전 구성 ────────────────────────
  const contextValue: AppContextValue = {
    cards,
    setCards,
    executedCardIds,
    setExecutedCardIds,
    currentTab: activeTab,
    selectedCard,
    isSaveSheetOpen: sheetOpen,
    isMemoSheetOpen: memoSheetOpen,
    memoTargetCard,
    setCurrentTab: handleTabChange,
    setSelectedCard,
    setIsSaveSheetOpen: setSheetOpen,
    setIsMemoSheetOpen: setMemoSheetOpen,
    setMemoTargetCard,
    handleExecuteCard,
    handleMemoComplete,
    handleMemoSkip,
    showToast,
  };

  // ── 반응형 루트 레이아웃 ─────────────────────────────────────────────────
  const rootStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        height: "100dvh",
        overflow: "hidden",
        background: "white",
        boxShadow: "0 0 40px rgba(0,0,0,0.08)",
        borderLeft: "0.5px solid rgba(0,0,0,0.06)",
        borderRight: "0.5px solid rgba(0,0,0,0.06)",
      }
    : {
        display: "flex",
        width: "100%",
        height: "100dvh",
        background: "white",
        overflow: "hidden",
      };

  // 로그인·온보딩은 전체 너비 풀스크린 — SideNav 없이
  const isFullscreenScreen = appScreen === "login" || appScreen === "onboarding";

  if (!isMobile && isFullscreenScreen) {
    return (
      <AppProvider value={contextValue}>
      <div style={{ width: "100%", height: "100dvh", overflow: "hidden" }}>
        {appScreen === "login" && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onGuestMode={handleGuestMode}
          />
        )}
        {appScreen === "onboarding" && (
          <OnboardingScreen
            key={onboardingKey}
            onComplete={handleOnboardingComplete}
            forceMode={forceOnboarding}
            onSaveCard={({ title, image, chips, savedReason, source, urlValue }) => {
              const newCard: CardData = {
                id: Date.now(),
                title: title || "새 레퍼런스",
                image: image || "",
                projectTag: "영감",
                savedReason: savedReason || "",
                chips: chips || [],
                source: source || "온보딩",
                statusDot: "미실행",
                daysAgo: "방금 전",
                processingStatus: "processing",
              };
              setCards((prev) => [newCard, ...prev]);
              if (supabase && currentUserId) {
                import("./lib/cardService").then(({ saveCard }) => {
                  saveCard({ ...newCard, urlValue, userId: currentUserId! });
                });
              }
            }}
            onImportCards={(importedCards) => {
              const now = Date.now();
              const newCards: CardData[] = importedCards.map((c, i) => ({
                id: now + i,
                title: c.title || "가져온 레퍼런스",
                image: c.image || "",
                projectTag: "영감",
                savedReason: c.savedReason || "",
                chips: c.chips || [],
                source: c.source || "",
                statusDot: "미실행",
                daysAgo: "방금 전",
              }));
              setCards((prev) => [...newCards, ...prev]);
              if (supabase && currentUserId) {
                import("./lib/cardService").then(({ saveCard }) => {
                  newCards.forEach((card) =>
                    saveCard({ ...card, urlValue: "", userId: currentUserId! })
                  );
                });
              }
            }}
          />
        )}
        {ToastNode}
      </div>
      </AppProvider>
    );
  }

  return (
    <AppProvider value={contextValue}>
    <div style={rootStyle}>
      {/* 태블릿/데스크탑: SideNav — 메인 화면에서만 표시 */}
      {!isMobile && appScreen === "main" && (
        <SideNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onFabPress={() => setSheetOpen(true)}
          onProfilePress={() => setSettingsVisible(true)}
          userName={userName ?? undefined}
        />
      )}

      {/* 메인 컨텐츠 영역 */}
      <div
        style={isMobile
          ? { position: "relative", width: "100%", height: "100%" }
          : {
              flex: 1,
              height: "100dvh",
              overflow: "hidden",
              position: "relative",
              background: "white",
              borderRight: isDesktop && appScreen === "main" ? "0.5px solid var(--redo-border)" : undefined,
            }
        }
      >
        {/* ── Login screen ── */}
        {appScreen === "login" && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onGuestMode={handleGuestMode}
          />
        )}

        {/* ── Onboarding screen ── */}
        {appScreen === "onboarding" && (
          <OnboardingScreen
            key={onboardingKey}
            onComplete={handleOnboardingComplete}
            forceMode={forceOnboarding}
            onSaveCard={({ title, image, chips, savedReason, source, urlValue }) => {
              const newCard: CardData = {
                id: Date.now(),
                title: title || "새 레퍼런스",
                image: image || "",
                projectTag: "영감",
                savedReason: savedReason || "",
                chips: chips || [],
                source: source || "온보딩",
                statusDot: "미실행",
                daysAgo: "방금 전",
                processingStatus: "processing",
              };
              setCards((prev) => [newCard, ...prev]);
              // Supabase 저장 (로그인된 경우)
              if (supabase && currentUserId) {
                import("./lib/cardService").then(({ saveCard }) => {
                  saveCard({ ...newCard, urlValue, userId: currentUserId! });
                });
              }
            }}
            onImportCards={(importedCards) => {
              const now = Date.now();
              const newCards: CardData[] = importedCards.map((c, i) => ({
                id: now + i,
                title: c.title || "가져온 레퍼런스",
                image: c.image || "",
                projectTag: "영감",
                savedReason: c.savedReason || "",
                chips: c.chips || [],
                source: c.source || "",
                statusDot: "미실행",
                daysAgo: "방금 전",
              }));
              setCards((prev) => [...newCards, ...prev]);
              // Supabase 일괄 저장
              if (supabase && currentUserId) {
                import("./lib/cardService").then(({ saveCard }) => {
                  newCards.forEach((card) =>
                    saveCard({ ...card, urlValue: "", userId: currentUserId! })
                  );
                });
              }
            }}
          />
        )}

        {/* ── Main app ── */}
        {appScreen === "main" && (
          <>
            {/* Tab screens */}
            <div style={{ position: "absolute", inset: 0 }}>
              {activeTab === "홈" && (
                <>
                  {/* Loading skeleton overlay */}
                  {cardsLoading && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "#fff",
                        zIndex: 10,
                        padding: "88px 16px 16px",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                        alignContent: "start",
                      }}
                    >
                      {[0, 1, 2].map((i) => (
                        <SkeletonCard key={i} />
                      ))}
                      <style>{`
                        @keyframes shimmer {
                          0% { opacity: 1; }
                          50% { opacity: 0.5; }
                          100% { opacity: 1; }
                        }
                      `}</style>
                    </div>
                  )}
                  <HomeScreen
                    onTabChange={handleTabChange}
                    onCardTap={handleOpenDetail}
                    onFabPress={() => setSheetOpen(true)}
                    executedCardIds={executedCardIds}
                    onExecute={handleExecuteCard}
                    laterCardIds={laterCardIds}
                    onLater={handleLaterCard}
                    onProfilePress={() => setSettingsVisible(true)}
                    onStationBannerTap={() => setIsStationStatusOpen(true)}
                    cards={cards}
                    userName={userName ?? undefined}
                  />
                </>
              )}
              {activeTab === "활용" && (
                <ActionScreen
                  cards={cards}
                  onTabChange={handleTabChange}
                  onFabPress={() => setSheetOpen(true)}
                  executedCardIds={executedCardIds}
                  onExecuteCard={handleExecuteCard}
                  onAllComplete={(stats) => {
                    setCompletionStats(stats);
                    setIsCompletionOpen(true);
                  }}
                />
              )}
              {activeTab === "보관" && (
                <ArchiveScreen
                  onTabChange={handleTabChange}
                  onCardTap={(card) => handleOpenDetail(card)}
                  onFabPress={() => setSheetOpen(true)}
                  pendingCard={pendingCard}
                  pendingStatus={pendingStatus}
                  executedCardIds={executedCardIds}
                  cards={cards}
                  folderColors={folderColors}
                />
              )}
              {activeTab === "기록" && (
                <InsightsScreen
                  cards={cards}
                  executedCardIds={executedCardIds}
                  onTabChange={handleTabChange}
                  onFabPress={() => setSheetOpen(true)}
                  onCardTap={handleOpenDetail}
                  userName={userName ?? undefined}
                />
              )}
            </div>

            {/* Detail screen — slides in on top from right (mobile / tablet only) */}
            {!isDesktop && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: slideTransform,
                  transition: slideTransition,
                  willChange: "transform",
                  pointerEvents: detailVisible ? "auto" : "none",
                }}
              >
                <DetailScreen
                  card={selectedCard}
                  allCards={cards}
                  backLabel={BACK_LABELS[returnTab]}
                  onBack={handleCloseDetail}
                  onRelatedTap={handleRelatedTap}
                  executedCardIds={executedCardIds}
                  onExecute={handleExecuteCard}
                  onLater={handleLaterCard}
                  onEditPress={selectedCard ? () => handleOpenEdit(selectedCard) : undefined}
                />
              </div>
            )}

            {/* Settings screen — slides in from right (z:65) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: settingsVisible ? "translateX(0)" : "translateX(100%)",
                transition: settingsVisible
                  ? "transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                  : "transform 250ms cubic-bezier(0.55, 0.0, 1.0, 0.45)",
                willChange: "transform",
                pointerEvents: settingsVisible ? "auto" : "none",
                zIndex: 65,
              }}
            >
              <SettingsScreen
                executedCardIds={executedCardIds}
                cards={cards}
                onBack={() => setSettingsVisible(false)}
                onSignOut={handleSignOut}
                currentUserId={currentUserId}
                userName={userName ?? undefined}
                onImportPress={() => setImportVisible(true)}
              />
            </div>

            {/* Import screen — slides in from right (z:66, above settings) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: importVisible ? "translateX(0)" : "translateX(100%)",
                transition: importVisible
                  ? "transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                  : "transform 250ms cubic-bezier(0.55, 0.0, 1.0, 0.45)",
                willChange: "transform",
                pointerEvents: importVisible ? "auto" : "none",
                zIndex: 66,
              }}
            >
              <ImportScreen
                onBack={() => setImportVisible(false)}
                existingProjects={existingProjects}
                onImport={(importedCards, projectTag) => {
                  const now = Date.now();
                  const newCards = importedCards.map((c, i) => ({
                    id: now + i,
                    title: c.title || "가져온 레퍼런스",
                    image: c.image || "",
                    projectTag,
                    savedReason: c.savedReason || "",
                    chips: c.chips || [],
                    source: c.source || "",
                    statusDot: "미실행" as const,
                    daysAgo: "방금 전",
                  }));
                  setCards((prev) => [...newCards, ...prev]);
                  // Supabase 일괄 저장
                  if (supabase && currentUserId) {
                    import("./lib/cardService").then(({ saveCard }) => {
                      newCards.forEach((card) =>
                        saveCard({
                          ...card,
                          urlValue: "",
                          userId: currentUserId!,
                        })
                      );
                    });
                  }
                }}
              />
            </div>

            {/* AI Recommend screen — slides in from right (z:55) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: aiRecommendVisible ? "translateX(0)" : "translateX(100%)",
                transition: aiRecommendVisible
                  ? "transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                  : "transform 250ms cubic-bezier(0.55, 0.0, 1.0, 0.45)",
                willChange: "transform",
                pointerEvents: aiRecommendVisible ? "auto" : "none",
                zIndex: 55,
              }}
            >
              <AIRecommendScreen
                cards={cards}
                executedCardIds={executedCardIds}
                onBack={() => setAiRecommendVisible(false)}
                onCardTap={(card) => {
                  setAiRecommendVisible(false);
                  handleOpenDetail(card);
                }}
                onExecute={handleExecuteCard}
              />
            </div>

            {/* Toast */}
            {ToastNode}

            {/* Save bottom sheet */}
            <SaveBottomSheet
              visible={sheetOpen}
              onClose={() => {
                setSheetOpen(false);
                setSheetInitialUrl(undefined);
                setSheetInitialTitle(undefined);
                // object URL 해제 (메모리 누수 방지)
                if (sheetInitialImageUrl) {
                  URL.revokeObjectURL(sheetInitialImageUrl);
                  setSheetInitialImageUrl(undefined);
                }
              }}
              onSave={handleSave}
              onOptimisticSave={handleOptimisticSave}
              initialUrl={sheetInitialUrl}
              initialTitle={sheetInitialTitle}
              initialImageUrl={sheetInitialImageUrl}
              isFromShare={isFromShare}
              existingProjects={existingProjects}
              folderColors={folderColors}
              onFolderColorChange={handleFolderColorChange}
            />

            {/* Execution memo sheet */}
            <ExecutionMemoSheet
              isOpen={memoSheetOpen}
              card={memoTargetCard}
              cards={cards}
              onComplete={handleMemoComplete}
              onSkip={handleMemoSkip}
              onClose={() => setMemoSheetOpen(false)}
            />

            {/* Card edit sheet */}
            <CardEditSheet
              isOpen={editSheetOpen}
              card={editTargetCard}
              onSave={(updated) => {
                if (editTargetCard) handleEditCard(editTargetCard.id, updated);
              }}
              onDelete={() => {
                if (editTargetCard) handleDeleteCard(editTargetCard);
              }}
              onClose={() => setEditSheetOpen(false)}
              existingProjects={existingProjects}
            />

            {/* NFC Trigger Screen — 전체 화면 오버레이 (z-index: 70) */}
            {isNFCTriggered && (
              <NFCTriggerScreen
                cards={cards}
                executedCardIds={executedCardIds}
                onExecuteNow={() => {
                  setIsNFCTriggered(false);
                  setActiveTab("활용");
                }}
                onDismiss={() => setIsNFCTriggered(false)}
              />
            )}

            {/* Context Recommend Screen — 전체 화면 오버레이 (z-index: 72) */}
            {isContextMode && (
              <ContextRecommendScreen
                cards={cards}
                executedCardIds={executedCardIds}
                existingProjects={existingProjects}
                onClose={() => setIsContextMode(false)}
                onCardTap={(card) => {
                  setIsContextMode(false);
                  handleOpenDetail(card);
                }}
                onExecuteCard={handleExecuteCard}
                showToast={showToast}
              />
            )}

            {/* Station Status Screen — 바텀시트 오버레이 (z-index: 68) */}
            {isStationStatusOpen && (
              <StationStatusScreen
                cards={cards}
                executedCardIds={executedCardIds}
                onClose={() => setIsStationStatusOpen(false)}
                onExecuteNow={() => {
                  setIsStationStatusOpen(false);
                  setActiveTab("활용");
                }}
              />
            )}

            {/* Completion Screen — 미실행 0개 달성 보상 (z-index: 75) */}
            {isCompletionOpen && (
              <CompletionScreen
                executedCount={completionStats.executed}
                skippedCount={completionStats.skipped}
                totalCards={cards.length}
                onSaveNew={() => {
                  setIsCompletionOpen(false);
                  setSheetOpen(true);
                }}
                onGoHome={() => {
                  setIsCompletionOpen(false);
                  setActiveTab("홈");
                }}
              />
            )}

            {/* Station Pairing Screen — 최초 NFC 페어링 (z-index: 80) */}
            {isStationPairing && (
              <StationPairingScreen
                onComplete={(threshold) => {
                  localStorage.setItem("redo_station_paired", "true");
                  localStorage.setItem("redo_station_threshold", String(threshold));
                  setIsStationPairing(false);
                  showToast({ variant: "success", sourceChip: "Station이 연결됐어요 ✓" });
                }}
                onDismiss={() => setIsStationPairing(false)}
              />
            )}
          </>
        )}
      </div>

      {/* Desktop: Detail panel as 3rd column (right side) */}
      {isDesktop && appScreen === "main" && (
        <div
          style={{
            flex: 1,
            minWidth: 360,
            maxWidth: 520,
            height: "100dvh",
            background: "white",
            borderLeft: "0.5px solid var(--redo-border)",
            flexShrink: 0,
            overflow: "hidden",
            display: detailVisible ? "flex" : "none",
            flexDirection: "column",
          }}
        >
          <DetailScreen
            card={selectedCard}
            allCards={cards}
            backLabel={BACK_LABELS[returnTab]}
            onBack={handleCloseDetail}
            onRelatedTap={handleRelatedTap}
            executedCardIds={executedCardIds}
            onExecute={handleExecuteCard}
            onLater={handleLaterCard}
            onEditPress={selectedCard ? () => handleOpenEdit(selectedCard) : undefined}
          />
        </div>
      )}
    </div>
    </AppProvider>
  );
}

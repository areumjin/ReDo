// ─── Shared card data type used across HomeScreen, ArchiveScreen, DetailScreen ─

export interface CardData {
  id: number;
  image: string;
  title: string;
  contentType?: "font" | "color" | "layout" | "article" | "mood" | "general";
  urlValue?: string; // 저장 시 원본 URL (Figma 내보내기, 중복 감지 등에 사용)
  projectTag: string;
  statusDot: "미실행" | "실행완료" | "보관중";
  savedReason: string;
  chips: string[];
  daysAgo: string;
  source: string;
  // Supabase 연동 필드 (optional)
  supabaseId?: string;
  executionMemo?: string;
  // AI 가공 상태
  processingStatus?: "raw" | "processing" | "processed" | "failed";
  aiAnalysis?: {
    reasons?: string[];
    keywords?: string[];
    category?: string;
    summary?: string;
    colors?: Array<{ hex: string; percentage: number }>;
    fonts?: Array<{ name: string; usage: string }>;
  };
}

// ─── Canonical feed data — single source of truth ────────────────────────────

export const ALL_CARDS: CardData[] = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1770581939371-326fc1537f10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0eXBvZ3JhcGh5JTIwcG9zdGVyJTIwZ3JhcGhpYyUyMGRlc2lnbnxlbnwxfHx8fDE3NzQ3OTU3ODl8MA&ixlib=rb-4.1.0&q=80&w=800",
    projectTag: "영감",
    title: "미니멀 타이포그래피 기반의 브랜드 아이덴티티 시스템",
    savedReason: "타이포 배치 방식이 내 로고 컨셉과 유사해서 참고하려고 저장",
    chips: ["타이포그래피", "미니멀", "아이덴티티", "브랜딩"],
    statusDot: "미실행",
    daysAgo: "7일 전",
    source: "Dribbble",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1774021803269-b1d0f92aaa07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleGhpYml0aW9uJTIwZGVzaWduJTIwbXVzZXVtJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzc0Nzk1NzkwfDA&ixlib=rb-4.1.0&q=80&w=800",
    projectTag: "작업",
    title: "관람객 동선 유도를 위한 공간 전시 디자인 레퍼런스",
    savedReason: "공간 레이아웃 구성 시 동선 참고용으로 저장",
    chips: ["전시", "공간", "조명"],
    statusDot: "미실행",
    daysAgo: "5일 전",
    source: "Behance",
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1730206562928-0efd62560435?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ24lMjBzdHVkaW8lMjB3b3Jrc3BhY2UlMjBjcmVhdGl2ZXxlbnwxfHx8fDE3NzQ3MDI1NTF8MA&ixlib=rb-4.1.0&q=80&w=800",
    projectTag: "기타",
    title: "크리에이티브 스튜디오 공간 구성 사례 — 색상과 분위기",
    savedReason: "색상 팔레트와 공간 구성 방식이 비주얼 무드와 잘 맞아서 저장",
    chips: ["공간", "컬러", "무드"],
    statusDot: "실행완료",
    daysAgo: "2일 전",
    source: "Pinterest",
  },
  {
    id: 4,
    image:
      "https://images.unsplash.com/photo-1658863025658-4a259cc68fc9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsJTIwYnJhbmQlMjBsb2dvJTIwZGVzaWduJTIwY29sb3JmdWx8ZW58MXx8fHwxNzc0Nzk4NTIwfDA&ixlib=rb-4.1.0&q=80&w=800",
    projectTag: "아이디어",
    title: "미니멀 로고 아이덴티티 컬러 시스템 레퍼런스",
    savedReason: "브랜드 컬러 배색 방식이 깔끔해서 컬러 시스템 구성에 참고할 것",
    chips: ["로고", "컬러", "브랜딩"],
    statusDot: "미실행",
    daysAgo: "3일 전",
    source: "Dribbble",
  },
];

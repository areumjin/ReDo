import type { CardData } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectStat {
  name: string;
  total: number;
  executed: number;
  executionRate: number;
}

export interface HabitStats {
  totalSaved: number;
  totalExecuted: number;
  executionRate: number;
  pendingCount: number;
}

export interface KeywordEntry {
  keyword: string;
  count: number;
  percent: number;
}

// ─── Core utilities ───────────────────────────────────────────────────────────

/** Flatten all chips arrays and count frequency per keyword */
export function calculateChipFrequency(
  cards: CardData[]
): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const card of cards) {
    for (const chip of card.chips) {
      freq[chip] = (freq[chip] ?? 0) + 1;
    }
  }
  return freq;
}

/** Return top N keywords sorted by count descending, with percent vs max */
export function getTopKeywords(
  freq: Record<string, number>,
  n: number
): KeywordEntry[] {
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
  const maxCount = sorted[0]?.[1] ?? 1;
  return sorted.map(([keyword, count]) => ({
    keyword,
    count,
    percent: Math.round((count / maxCount) * 100),
  }));
}

/** Group cards by projectTag, calculate total / executed / rate */
export function calculateProjectStats(
  cards: CardData[],
  executedIds: Set<number>
): ProjectStat[] {
  const groups: Record<string, CardData[]> = {};
  for (const card of cards) {
    if (!groups[card.projectTag]) groups[card.projectTag] = [];
    groups[card.projectTag].push(card);
  }

  return Object.entries(groups)
    .map(([name, group]) => {
      const total = group.length;
      const executed = group.filter(
        (c) => executedIds.has(c.id) || c.statusDot === "실행완료"
      ).length;
      const executionRate = total > 0 ? Math.round((executed / total) * 100) : 0;
      return { name, total, executed, executionRate };
    })
    .sort((a, b) => b.total - a.total); // most cards first
}

/** Overall habit statistics */
export function calculateHabitStats(
  cards: CardData[],
  executedIds: Set<number>
): HabitStats {
  const totalSaved = cards.length;
  const totalExecuted = cards.filter(
    (c) => executedIds.has(c.id) || c.statusDot === "실행완료"
  ).length;
  const pendingCount = totalSaved - totalExecuted;
  const executionRate =
    totalSaved > 0 ? Math.round((totalExecuted / totalSaved) * 100) : 0;
  return { totalSaved, totalExecuted, pendingCount, executionRate };
}

/**
 * Simulate a 6-point "saves over time" sparkline.
 * Uses card index as a time proxy (ascending = older → newer).
 * Pads to at least 6 reasonable values.
 */
export function getSparklineData(cards: CardData[]): number[] {
  const total = cards.length;
  const POINTS = 6;

  if (total === 0) return [0, 0, 0, 0, 0, 0];

  // Distribute cards across 6 buckets (cumulative)
  return Array.from({ length: POINTS }, (_, i) => {
    const cumulative = Math.round(total * ((i + 1) / POINTS));
    // Add small variance so the line isn't perfectly straight
    const variance = i < POINTS - 1 ? (i % 2 === 0 ? -1 : 1) : 0;
    return Math.max(1, cumulative + variance);
  });
}

/** Count card frequency by source field */
export function getSourceFrequency(
  cards: CardData[]
): { source: string; count: number; percent: number }[] {
  const freq: Record<string, number> = {};
  for (const card of cards) {
    const src = card.source || "기타";
    freq[src] = (freq[src] ?? 0) + 1;
  }
  const total = cards.length || 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({
      source,
      count,
      percent: Math.round((count / total) * 100),
    }));
}

// Color-related keywords and their display colors
const COLOR_KEYWORD_MAP: Record<string, string> = {
  컬러: "#6A70FF",
  컬러풀: "#E24B4A",
  흑백: "#2C2C2A",
  모노크롬: "#555",
  파스텔: "#F5A0B5",
  네온: "#39C0BA",
  비비드: "#EF9F27",
  어스톤: "#9B7F5A",
  모노톤: "#888780",
  그레이: "#888780",
  블루: "#4A90D9",
  레드: "#E24B4A",
  그린: "#1D9E75",
};

/** Extract color-related keywords from cards' chips */
export function getColorKeywords(
  cards: CardData[]
): { label: string; count: number; color: string }[] {
  const freq: Record<string, number> = {};
  for (const card of cards) {
    for (const chip of card.chips) {
      if (COLOR_KEYWORD_MAP[chip] !== undefined) {
        freq[chip] = (freq[chip] ?? 0) + 1;
      }
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      color: COLOR_KEYWORD_MAP[label],
    }));
}

/**
 * Compare recent-half vs older-half chip frequencies.
 * Returns the keyword with the greatest relative increase.
 */
export function getTrendKeyword(cards: CardData[]): string | null {
  if (cards.length < 2) return null;
  const half = Math.ceil(cards.length / 2);
  const older = cards.slice(0, half);
  const recent = cards.slice(half);

  const olderFreq = calculateChipFrequency(older);
  const recentFreq = calculateChipFrequency(recent);

  let bestKeyword: string | null = null;
  let bestDelta = -Infinity;

  for (const [kw, recentCount] of Object.entries(recentFreq)) {
    const olderCount = olderFreq[kw] ?? 0;
    const delta = recentCount - olderCount;
    if (delta > bestDelta) {
      bestDelta = delta;
      bestKeyword = kw;
    }
  }
  return bestDelta > 0 ? bestKeyword : null;
}

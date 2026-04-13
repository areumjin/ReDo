// ─── 연관성 점수 알고리즘 (Phase 5-1) ───────────────────────────────────────

import type { CardData } from "../types";

export interface RelevanceContext {
  /** 현재 활성화된 프로젝트 필터 */
  projectTag?: string;
  /** 레퍼런스 접근을 통해 수집한 관심 키워드 */
  chips?: string[];
  /** 최근 열람한 카드 IDs */
  recentlyViewedIds?: number[];
}

/**
 * 단일 카드에 대한 연관성 점수 계산
 *
 * 점수 기준:
 *  +3 — 현재 프로젝트와 동일한 projectTag
 *  +2 — 최근 열람한 카드와 같은 projectTag
 *  +1 — chips 중 관심 키워드와 일치하는 항목 (개당)
 * +0.5 — savedReason 텍스트에 관심 키워드 포함 (개당)
 * +0.5 — 미실행 카드 우선 노출
 * -1  — 이미 실행 완료한 카드
 */
export function scoreRelevance(
  card: CardData,
  context: RelevanceContext,
  executedIds: Set<number> = new Set()
): number {
  let score = 0;

  // 1. 프로젝트 태그 일치
  if (context.projectTag && context.projectTag !== "전체") {
    if (card.projectTag === context.projectTag) {
      score += 3;
    }
  }

  // 2. 관심 키워드 (chips) 매칭
  if (context.chips && context.chips.length > 0) {
    const normalizedContextChips = context.chips.map((c) => c.toLowerCase().trim());
    for (const chip of card.chips) {
      if (normalizedContextChips.includes(chip.toLowerCase().trim())) {
        score += 1;
      }
    }
    // savedReason 텍스트 매칭
    if (card.savedReason) {
      const reasonLower = card.savedReason.toLowerCase();
      for (const chip of normalizedContextChips) {
        if (reasonLower.includes(chip)) {
          score += 0.5;
        }
      }
    }
    // AI 키워드 매칭
    if (card.aiAnalysis?.keywords) {
      for (const kw of card.aiAnalysis.keywords) {
        if (normalizedContextChips.includes(kw.toLowerCase().trim())) {
          score += 0.5;
        }
      }
    }
  }

  // 3. 실행 상태 보정
  const isExecuted = executedIds.has(card.id) || card.statusDot === "실행완료";
  if (!isExecuted) {
    score += 0.5; // 미실행 카드 우선
  } else {
    score -= 1; // 실행완료 카드 후순위
  }

  // 4. AI 처리 완료 카드 소폭 우선
  if (card.processingStatus === "processed") {
    score += 0.3;
  }

  return score;
}

/**
 * 관심 컨텍스트 자동 추출
 * - 최근 열람 카드들의 chips를 집계하여 관심 키워드 구성
 */
export function buildContext(
  cards: CardData[],
  activeFilter: string,
  recentlyViewedIds: number[]
): RelevanceContext {
  const recentCards = cards.filter((c) => recentlyViewedIds.includes(c.id));
  const chipFreq: Record<string, number> = {};
  for (const card of recentCards) {
    for (const chip of card.chips) {
      chipFreq[chip] = (chipFreq[chip] ?? 0) + 1;
    }
  }
  // 빈도순 정렬, 상위 8개 추출
  const topChips = Object.entries(chipFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([chip]) => chip);

  return {
    projectTag: activeFilter !== "전체" ? activeFilter : undefined,
    chips: topChips,
    recentlyViewedIds,
  };
}

/**
 * 카드 배열을 연관성 점수 내림차순으로 정렬
 */
export function sortByRelevance(
  cards: CardData[],
  context: RelevanceContext,
  executedIds: Set<number> = new Set()
): CardData[] {
  return [...cards].sort((a, b) => {
    const scoreA = scoreRelevance(a, context, executedIds);
    const scoreB = scoreRelevance(b, context, executedIds);
    return scoreB - scoreA;
  });
}

/**
 * 피드 내 "지금 작업에 어울리는 레퍼런스" 후보 추출
 * 연관성 점수 상위 3개, 미실행 카드만
 */
export function getTopRelevant(
  cards: CardData[],
  context: RelevanceContext,
  executedIds: Set<number> = new Set(),
  limit = 3
): CardData[] {
  const candidates = cards.filter(
    (c) => !executedIds.has(c.id) && c.statusDot !== "실행완료"
  );
  const scored = candidates.map((c) => ({
    card: c,
    score: scoreRelevance(c, context, executedIds),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, limit)
    .map((s) => s.card);
}

/**
 * "다시 꺼내볼 레퍼런스" — 오래된 미실행 카드
 * daysAgo 파싱 또는 id 기반 heuristic으로 오래된 카드 추출
 */
export function getRediscoverCards(
  cards: CardData[],
  executedIds: Set<number> = new Set(),
  limit = 2
): CardData[] {
  const unexecuted = cards.filter(
    (c) => !executedIds.has(c.id) && c.statusDot !== "실행완료"
  );

  // daysAgo 파싱 (예: "7일 전", "5일 전", "방금 전")
  const withAge = unexecuted.map((c) => {
    const match = c.daysAgo.match(/(\d+)/);
    const days = match ? parseInt(match[1], 10) : 0;
    return { card: c, days };
  });

  // 3일 이상 된 카드 우선, 오래된 순 정렬
  const old = withAge.filter((x) => x.days >= 3).sort((a, b) => b.days - a.days);
  // 최근 카드로 부족분 채움
  const recent = withAge.filter((x) => x.days < 3);

  const result = [...old, ...recent].slice(0, limit).map((x) => x.card);

  // 결과가 너무 적으면 랜덤 셔플로 다양성 추가
  if (result.length < limit && unexecuted.length > limit) {
    const shuffled = [...unexecuted].sort(() => Math.random() - 0.5);
    for (const c of shuffled) {
      if (!result.find((r) => r.id === c.id)) {
        result.push(c);
        if (result.length >= limit) break;
      }
    }
  }

  return result;
}

/**
 * 전체 카드에서 키워드 클라우드 생성
 * chips 빈도순 상위 N개 반환
 */
export function buildKeywordCloud(
  cards: CardData[],
  limit = 12
): Array<{ keyword: string; count: number }> {
  const freq: Record<string, number> = {};
  for (const card of cards) {
    for (const chip of card.chips) {
      freq[chip] = (freq[chip] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword, count]) => ({ keyword, count }));
}

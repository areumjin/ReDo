# ReDo 코드 전체 감사 보고서
> 기준일: 2026-04-14 | 검토 범위: src/ 전체 (104개 파일)

---

## 파일 구조

```
src/
├── App.tsx                          ✅ 메인 진입점 (main.tsx에서 import)
├── main.tsx                         ✅ React 루트
├── types.ts                         ✅ CardData 타입 + ALL_CARDS 데이터
│
├── app/                             ❌ 전체 미사용 (구버전 잔존)
│   ├── App.tsx
│   ├── components/
│   │   ├── AppBottomNav.tsx
│   │   ├── DetailScreen.tsx
│   │   └── SaveBottomSheet.tsx
│   └── screens/
│       ├── ActionScreen.tsx
│       ├── ConnectPlatformScreen.tsx
│       ├── HomeScreen.tsx
│       └── OnboardingScreen.tsx
│
├── screens/                         ✅ 활성 화면 (9개)
│   ├── HomeScreen.tsx
│   ├── ActionScreen.tsx
│   ├── ArchiveScreen.tsx
│   ├── DetailScreen.tsx
│   ├── InsightsScreen.tsx
│   ├── AIRecommendScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── LoginScreen.tsx
│   └── OnboardingScreen.tsx
│
├── components/                      ✅ 활성 컴포넌트
│   ├── AppBottomNav.tsx
│   ├── SaveBottomSheet.tsx
│   ├── ExecutionMemoSheet.tsx
│   ├── CardEditSheet.tsx
│   ├── Toast.tsx
│   ├── ImageWithFallback.tsx
│   ├── StatusBar.tsx
│   ├── ui/                          ⚠️ shadcn/ui 45개 (대부분 미사용)
│   └── patterns/                    ⚠️ StyleSeed 패턴 15개 (대부분 미사용)
│
├── lib/                             ✅ Phase 2 백엔드 연동
│   ├── supabase.ts
│   ├── auth.ts
│   ├── cardService.ts
│   └── schema.sql
│
├── styles/
│   ├── index.css                    ✅ 진입점
│   ├── theme.css                    ✅ CSS 변수 정의
│   ├── base.css                     ✅ 기본 스타일
│   └── fonts.css                    ✅ 폰트
│
├── data/
│   └── mockCards.ts                 ❌ 미사용 (src/app/에서만 참조)
│
├── types/
│   └── index.ts                     ❌ 미사용 (구버전 타입 정의)
│
├── imports/                         ❌ 미사용
│   ├── Body.tsx
│   └── svg-uhrfxg5ltt.ts
│
└── utils/
    ├── insightsData.ts              ✅ InsightsScreen에서 사용
    └── fetchMetadata.ts             ✅ SaveBottomSheet에서 사용
```

---

## 중복 파일

| 파일명 | 활성 위치 | 중복 위치 | 실제 사용 | 삭제 대상 |
|--------|-----------|-----------|-----------|-----------|
| App.tsx | `src/App.tsx` | `src/app/App.tsx` | src/App.tsx | `src/app/App.tsx` |
| HomeScreen.tsx | `src/screens/HomeScreen.tsx` | `src/app/screens/HomeScreen.tsx` | src/screens/ | `src/app/screens/HomeScreen.tsx` |
| ActionScreen.tsx | `src/screens/ActionScreen.tsx` | `src/app/screens/ActionScreen.tsx` | src/screens/ | `src/app/screens/ActionScreen.tsx` |
| OnboardingScreen.tsx | `src/screens/OnboardingScreen.tsx` | `src/app/screens/OnboardingScreen.tsx` | src/screens/ | `src/app/screens/OnboardingScreen.tsx` |
| SaveBottomSheet.tsx | `src/components/SaveBottomSheet.tsx` | `src/app/components/SaveBottomSheet.tsx` | src/components/ | `src/app/components/SaveBottomSheet.tsx` |
| AppBottomNav.tsx | `src/components/AppBottomNav.tsx` | `src/app/components/AppBottomNav.tsx` | src/components/ | `src/app/components/AppBottomNav.tsx` |
| DetailScreen | `src/screens/DetailScreen.tsx` | `src/app/components/DetailScreen.tsx` | src/screens/ | `src/app/components/DetailScreen.tsx` |
| CardData 타입 | `src/types.ts` | `src/types/index.ts` | src/types.ts | `src/types/index.ts` |

### 삭제 대상 디렉토리/파일 (전체)
```
src/app/                  ← 전체 디렉토리 (8개 파일)
src/types/index.ts        ← 구버전 타입 정의 (CardData 필드가 다름)
src/data/mockCards.ts     ← 구버전 목 데이터 (src/app/에서만 사용)
src/imports/              ← 전체 디렉토리 (2개 파일)
```
> **총 12개 파일 삭제 시 번들 크기 감소, 혼란 제거**

### 타입 불일치 경고
`src/types/index.ts` (구버전)의 CardData와 `src/types.ts` (현재)의 CardData는 필드가 다름:
```
구버전: id, title, source, sourceUrl?, imageUrl?, chips[], projectTag,
        savedAt, savedReason?, status('pending'|'done'), executionMemo?, executedAt?

현재:   id, image, title, projectTag, statusDot('미실행'|'실행완료'|'보관중'),
        savedReason, chips[], daysAgo, source, supabaseId?, executionMemo?
```

---

## Import 경로 오류

| 파일 | 오류 내용 | 심각도 |
|------|-----------|--------|
| `src/screens/ActionScreen.tsx` | `ALL_CARDS`를 직접 import해서 사용 — props로 받은 cards를 무시 | 🔴 데이터 흐름 충돌 |
| `src/screens/DetailScreen.tsx` | `ALL_CARDS`를 직접 import해서 관련 카드 조회 — App.tsx의 최신 cards 상태 반영 안 됨 | 🔴 데이터 흐름 충돌 |
| `src/screens/HomeScreen.tsx` | `ALL_CARDS` import는 폴백용으로만 쓰고 props 우선 — 허용 | 🟡 |
| `src/screens/ArchiveScreen.tsx` | `ALL_CARDS` import는 폴백용으로만 쓰고 props 우선 — 허용 | 🟡 |

> **활성 파일 간 구 경로(`src/app/...`) import는 없음** — main.tsx → src/App.tsx 경로는 정상

---

## 디자인 시스템 충돌

### theme.css 정의 변수 (ReDo 전용)
```css
--redo-brand: #6A70FF
--redo-brand-light: #EEEFFE
--redo-brand-dark: #4B52E0
--redo-brand-mid: #A5A9FF
--redo-bg-primary: #FFFFFF
--redo-bg-secondary: #F8F7F4
--redo-bg-input: #F1EFE8
--redo-text-primary: #2C2C2A
--redo-text-secondary: #888780
--redo-text-tertiary: #B4B2A9
--redo-context-bg: #EEEFFE
--redo-context-text: #3C3489
--redo-context-label: #4B52E0
--redo-success: #1D9E75
--redo-warning: #EF9F27
--redo-danger: #E24B4A
--redo-border: rgba(0,0,0,0.12)
```

### 파일별 CSS 변수 vs 하드코딩 현황

| 파일 | CSS var 사용 | 하드코딩 hex | 비율 | 상태 |
|------|------------|------------|------|------|
| AppBottomNav.tsx | ✅ var(--redo-brand) 등 4곳 | 없음 | 100% 변수 | ✅ 우수 |
| CardEditSheet.tsx | ✅ var(--redo-*) 8곳 | 없음 | 100% 변수 | ✅ 우수 |
| ExecutionMemoSheet.tsx | ✅ var(--redo-*) 다수 | 없음 | 100% 변수 | ✅ 우수 |
| Toast.tsx | ✅ var(--redo-success/danger/warning) | #2C2C2A, #B4B2A9 2곳 | ~80% 변수 | 🟡 양호 |
| ActionScreen.tsx | ✅ var(--redo-*) 50곳 | 6곳 | ~90% 변수 | 🟡 양호 |
| DetailScreen.tsx | ✅ var(--redo-*) 34곳 | 2곳 | ~95% 변수 | 🟡 양호 |
| ArchiveScreen.tsx | ✅ var(--redo-*) 56곳 | 10곳 | ~85% 변수 | 🟡 양호 |
| HomeScreen.tsx | ✅ var(--redo-*) 27곳 | 24곳 | ~53% 변수 | 🟡 혼용 |
| SettingsScreen.tsx | ✅ var(--redo-*) 20곳 | 23곳 | ~47% 변수 | 🔴 혼용 심각 |
| LoginScreen.tsx | ❌ CSS 변수 0곳 | 25곳 | 0% 변수 | 🔴 전부 하드코딩 |
| App.tsx | ❌ CSS 변수 0곳 | ~12곳 | 0% 변수 | 🔴 전부 하드코딩 |

### 하드코딩 대신 써야 할 변수 매핑
| 하드코딩 값 | 대체 변수 |
|-----------|---------|
| `#6A70FF` | `var(--redo-brand)` |
| `#EEEFFE` | `var(--redo-context-bg)` 또는 `var(--redo-brand-light)` |
| `#534AB7`, `#4B52E0` | `var(--redo-brand-dark)` |
| `#3C3489`, `#534AB7` | `var(--redo-context-text)` |
| `#2C2C2A` | `var(--redo-text-primary)` |
| `#888780` | `var(--redo-text-secondary)` |
| `#B4B2A9` | `var(--redo-text-tertiary)` |
| `#1D9E75` | `var(--redo-success)` |
| `#E24B4A` | `var(--redo-danger)` |
| `#F8F7F4`, `#F1EFE8` | `var(--redo-bg-secondary)` / `var(--redo-bg-input)` |

---

## 스타일 혼용

| 파일 | 방식 | 문제 |
|------|------|------|
| src/App.tsx | 100% inline `style={{}}` | 없음 (일관성 있음) |
| src/screens/HomeScreen.tsx | 100% inline `style={{}}` | 없음 |
| src/screens/ActionScreen.tsx | 100% inline `style={{}}` | 없음 |
| src/screens/DetailScreen.tsx | 100% inline `style={{}}` | 없음 |
| src/screens/ArchiveScreen.tsx | 100% inline `style={{}}` | 없음 |
| src/screens/InsightsScreen.tsx | 100% inline `style={{}}` | 없음 |
| src/screens/SettingsScreen.tsx | 100% inline `style={{}}` | 없음 |
| src/screens/LoginScreen.tsx | 100% inline `style={{}}` | 없음 |
| src/screens/OnboardingScreen.tsx | 100% inline `style={{}}` | 없음 |
| src/components/*.tsx | 100% inline `style={{}}` | 없음 |
| src/components/ui/*.tsx | 100% Tailwind `className` | 없음 |
| src/components/patterns/*.tsx | 100% Tailwind `className` | 없음 |

> **결론: 스타일 방식 자체는 일관성 있음.** 커스텀 컴포넌트는 전부 inline, UI 라이브러리는 전부 Tailwind.  
> 단, shadcn/ui와 patterns 컴포넌트는 현재 앱 화면에서 **사용되지 않음** — 빌드 크기만 증가시킴.

---

## 데이터 흐름 충돌

### cards 데이터 출처

| 컴포넌트 | cards 출처 | 문제 |
|---------|-----------|------|
| `App.tsx` | `useState([...ALL_CARDS])` → Supabase 폴백 | ✅ 정상 |
| `HomeScreen` | props.cards 우선, `ALL_CARDS` 폴백 | ✅ 정상 |
| `ArchiveScreen` | props.cards 우선, `ALL_CARDS` 폴백 | ✅ 정상 |
| `InsightsScreen` | props.cards | ✅ 정상 |
| `AIRecommendScreen` | props.cards | ✅ 정상 |
| `ActionScreen` | **`ALL_CARDS` 직접 참조** (props 없음) | 🔴 충돌 — 저장한 새 카드가 활용 탭에 안 나타남 |
| `DetailScreen` | 관련 카드 조회 시 **`ALL_CARDS` 직접 참조** | 🔴 충돌 — 새 카드의 관련 카드 탐색 안 됨 |

### executedCardIds 흐름

| 위치 | 역할 | 상태 |
|------|------|------|
| `App.tsx` | `useState<Set<number>>(new Set())` — 중앙 관리 | ✅ 정상 |
| `HomeScreen` | props로 받아서 표시 | ✅ 정상 |
| `ActionScreen` | props로 받아서 표시 | ✅ 정상 |
| `ArchiveScreen` | props로 받아서 표시 | ✅ 정상 |
| `DetailScreen` | props로 받아서 표시 | ✅ 정상 |
| `InsightsScreen` | props로 받아서 통계 계산 | ✅ 정상 |

---

## 우선순위별 수정 목록

### 🔴 즉시 수정 (런타임 데이터 오류)

**1. ActionScreen — ALL_CARDS 직접 참조**
```
문제: 사용자가 FAB으로 새 카드를 저장해도 활용 탭에 나타나지 않음
     (App.tsx의 cards state 대신 정적 ALL_CARDS를 봄)
수정: App.tsx에서 cards prop을 ActionScreen에 전달하고,
     ActionScreen 내부에서 ALL_CARDS 대신 props.cards 사용
```

**2. DetailScreen — 관련 카드 조회 시 ALL_CARDS 직접 참조**
```
문제: 새로 저장한 카드를 DetailScreen에서 볼 때
     관련 카드 섹션에 새 카드가 포함되지 않음
수정: App.tsx에서 cards를 DetailScreen에 전달하고,
     ALL_CARDS 대신 props.cards로 관련 카드 필터링
```

---

### 🟡 정리 필요 (코드 혼용/중복)

**3. 미사용 파일 일괄 삭제**
```
삭제 대상:
  src/app/                (8개 파일 — 구버전 코드)
  src/types/index.ts      (구버전 타입 정의)
  src/data/mockCards.ts   (구버전 목 데이터)
  src/imports/            (2개 파일 — 미사용)

효과: 빌드 클린업, 오염 방지, Vercel 빌드 속도 개선
```

**4. LoginScreen CSS 변수 적용**
```
문제: 25개 하드코딩 hex — 향후 테마 변경 시 누락 위험
수정: #6A70FF → var(--redo-brand), #888780 → var(--redo-text-secondary) 등
```

**5. SettingsScreen CSS 변수 적용**
```
문제: 23개 하드코딩 hex
수정: 동일하게 CSS 변수로 교체
```

---

### 🟢 권고사항 (코드 품질)

**6. shadcn/ui + patterns 컴포넌트 정리**
```
현황: src/components/ui/ (45개), src/components/patterns/ (15개) 존재
     하지만 현재 앱 화면에서 실제 사용하는 컴포넌트는 소수
권고: 실제 사용 중인 것만 남기고 나머지 삭제 → 번들 크기 감소
```

**7. App.tsx 인라인 스타일 CSS 변수 적용**
```
현황: 로딩 화면, 스켈레톤 등에 하드코딩 hex 사용
권고: var(--redo-brand) 등으로 교체
```

**8. Toast.tsx 나머지 하드코딩 교체**
```
#2C2C2A → var(--redo-text-primary)
#B4B2A9 → var(--redo-text-tertiary)
```

---

## 요약 통계

| 항목 | 수치 |
|------|------|
| 전체 파일 수 | 104개 |
| 삭제 대상 파일 | 12개 (src/app/, types/index.ts, data/mockCards.ts, imports/) |
| 데이터 흐름 충돌 | 2개 (ActionScreen, DetailScreen) |
| CSS 변수 미적용 파일 | 2개 (LoginScreen, App.tsx 로딩부) |
| CSS 변수 부분 적용 | 3개 (HomeScreen, SettingsScreen, Toast) |
| CSS 변수 완전 적용 | 5개 (AppBottomNav, CardEditSheet, ExecutionMemoSheet, ActionScreen, DetailScreen 등) |

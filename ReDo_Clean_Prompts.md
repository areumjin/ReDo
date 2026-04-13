# ReDo 코드 정리 프롬프트

> 감사 보고서(ReDo_Code_Audit.md) 기반.
> 순서대로 실행. 각 완료 후 빌드 확인.

---

## CLEAN-01. 미사용 파일 전체 삭제 (5분)

```
아래 파일/폴더를 전부 삭제해줘.
모두 구버전 잔존 파일로 현재 앱에서 사용되지 않음.

삭제 대상:
  src/app/                    ← 구버전 코드 전체 (8개 파일)
  src/types/index.ts          ← 구버전 타입 정의
  src/data/mockCards.ts       ← 구버전 목 데이터
  src/imports/                ← Body.tsx, svg 파일 (미사용)

삭제 전 확인:
  위 경로들이 현재 활성 파일(src/App.tsx, src/screens/*, src/components/*)
  어디에서도 import되지 않는지 grep으로 먼저 확인.
  import 발견 시 해당 import 먼저 제거 후 삭제.

삭제 후:
  npm run build 에러 없는지 확인.
```

---

## CLEAN-02. 데이터 흐름 충돌 수정 (10분) ← 가장 중요

```
ActionScreen과 DetailScreen이 App.tsx의 cards state 대신
ALL_CARDS 정적 배열을 직접 참조하고 있어.
새로 저장한 카드가 활용 탭과 관련 카드에 안 나타나는 버그.

───────────────────────────────────────
【1】 ActionScreen.tsx 수정
───────────────────────────────────────

현재:
  ALL_CARDS를 직접 import해서 스와이프 덱 생성

수정:
  1. ALL_CARDS import 제거
  2. props에 cards: CardData[] 추가:
     interface ActionScreenProps {
       cards: CardData[]          ← 추가
       executedCardIds: Set<number>
       onExecuteCard: (id: number) => void
       onTabChange: (tab: ActiveTab) => void
       onFabPress: () => void
     }
  3. 스와이프 덱 초기화 시 ALL_CARDS → props.cards 사용

App.tsx 수정:
  <ActionScreen
    cards={cards}              ← 추가
    executedCardIds={executedCardIds}
    onExecuteCard={handleExecuteCard}
    ...
  />

───────────────────────────────────────
【2】 DetailScreen.tsx 수정
───────────────────────────────────────

현재:
  관련 카드 조회 시 ALL_CARDS를 직접 import해서 필터링

수정:
  1. ALL_CARDS import 제거
  2. props에 allCards: CardData[] 추가:
     interface DetailScreenProps {
       allCards: CardData[]       ← 추가
       card: CardData | null
       ...
     }
  3. 관련 카드 필터링 시 ALL_CARDS → props.allCards 사용

App.tsx 수정:
  <DetailScreen
    allCards={cards}             ← 추가
    card={selectedCard}
    ...
  />

빌드 확인.
```

---

## CLEAN-03. CSS 변수 일괄 적용 (10분)

```
LoginScreen.tsx, SettingsScreen.tsx, App.tsx, Toast.tsx의
하드코딩 hex를 CSS 변수로 교체해줘.

교체 규칙 (전체 파일 일괄 적용):
  '#6A70FF'  → 'var(--redo-brand)'
  '#4B52E0'  → 'var(--redo-brand-dark)'
  '#A5A9FF'  → 'var(--redo-brand-mid)'
  '#EEEFFE'  → 'var(--redo-brand-light)'
  '#2C2C2A'  → 'var(--redo-text-primary)'
  '#888780'  → 'var(--redo-text-secondary)'
  '#B4B2A9'  → 'var(--redo-text-tertiary)'
  '#1D9E75'  → 'var(--redo-success)'
  '#E24B4A'  → 'var(--redo-danger)'
  '#EF9F27'  → 'var(--redo-warning)'
  '#F8F7F4'  → 'var(--redo-bg-secondary)'
  '#F1EFE8'  → 'var(--redo-bg-input)'
  '#FFFFFF'  → 'var(--redo-bg-primary)' (배경으로 쓰인 경우만)
  '#3C3489'  → 'var(--redo-context-text)'

대상 파일:
  src/screens/LoginScreen.tsx
  src/screens/SettingsScreen.tsx
  src/App.tsx (로딩/스켈레톤 부분)
  src/components/Toast.tsx

주의:
  rgba() 안에 있는 경우: rgba(106,112,255,...) → 유지
  (CSS 변수는 rgba() 안에 직접 못 씀)
  단, box-shadow나 border에서 var(--redo-brand) 사용 가능한 경우는 교체.

빌드 확인.
```

---

## CLEAN-04. 미사용 UI 컴포넌트 정리 (5분)

```
src/components/ui/ (45개)와 src/components/patterns/ (15개) 중
현재 앱 화면에서 실제 import해서 사용하는 컴포넌트만 남기고 나머지 삭제.

확인 방법:
  각 ui/*.tsx 파일명을 src/screens/*.tsx, src/components/*.tsx,
  src/App.tsx에서 import하는지 grep으로 확인.

사용 중인 것: 유지
사용 안 하는 것: 삭제

삭제 후 npm run build 에러 없는지 확인.
에러 나는 파일은 삭제 취소하고 목록에서 제외.

완료 후 삭제된 파일 수와 남은 파일 수 알려줘.
```

---

## CLEAN-05. 최종 빌드 + 검증

```
모든 정리 완료 후 최종 확인.

1. npm run build
   - 에러 0개 확인
   - 번들 크기 확인 (CLEAN 전과 비교)

2. npm run dev 실행 후 브라우저에서 확인:
   - 홈 탭 카드 정상 표시
   - FAB → 저장 → 홈/보관 탭에 카드 추가됨
   - 저장한 카드가 활용 탭에도 나타남  ← CLEAN-02 검증
   - 실행하기 → 전체 탭 동기화
   - 설정 화면 다크모드 토글 (CSS 변수 검증)

3. 결과 요약 출력:
   - 삭제된 파일 수
   - 수정된 파일 수
   - 빌드 번들 크기 (전후 비교)
   - 남은 이슈 있으면 목록으로
```

---

## 진행 순서

| # | 프롬프트 | 내용 | 중요도 |
|---|---------|------|-------|
| 1 | CLEAN-01 | 미사용 파일 삭제 | 🟡 정리 |
| 2 | CLEAN-02 | 데이터 흐름 충돌 수정 | 🔴 버그 수정 |
| 3 | CLEAN-03 | CSS 변수 일괄 적용 | 🟡 정리 |
| 4 | CLEAN-04 | 미사용 UI 컴포넌트 정리 | 🟢 최적화 |
| 5 | CLEAN-05 | 최종 빌드 검증 | ✅ 완료 확인 |

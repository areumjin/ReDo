# ReDo App — Final UX/UI Review

> **Review Date:** 2026-04-13
> **Reviewer:** Claude (UX/UI Audit)
> **Scope:** Onboarding, Connect, Home, Action, Detail, Save Sheet, Bottom Nav

---

## 1. Overall Assessment

| Category | Score | Note |
|----------|-------|------|
| Visual Consistency | 4/5 | Semantic tokens well applied; minor inline style inconsistencies in Onboarding |
| Information Architecture | 4/5 | Clear 2-tab structure; Phase 2 tabs may confuse users |
| Interaction Design | 3.5/5 | Swipe gesture well done; some touch targets too small |
| Accessibility | 3/5 | Some aria-labels missing; color-only status indicators |
| Error Handling | 2/5 | No error states, no validation feedback, no loading states |
| Responsiveness | 4/5 | Mobile-first 375px well executed; needs safe-area refinement |

**Overall: 3.4 / 5** — Strong visual foundation. Needs functional polish before user testing.

---

## 2. Critical Issues (Must Fix)

### 2.1 `onExecute` is one-way — cannot undo
**Location:** `ActionScreen.tsx:53`, `App.tsx:42-44`
**Problem:** Tapping the circle marks a card as "done" but there's no way to undo it. The `aria-label` says "완료 취소" but `handleExecute` only adds to the Set, never removes.
**Impact:** Users who accidentally tap will be stuck.
**Fix:** Toggle the Set (add if missing, delete if present).

### 2.2 SaveBottomSheet doesn't actually save anything
**Location:** `SaveBottomSheet.tsx:14-18`
**Problem:** `handleSave` clears the form and closes the sheet, but never calls back to `App.tsx` to add the card to the list. There's no `onSave` prop.
**Impact:** Users press "저장하기" and nothing appears — breaks core promise.
**Fix:** Add `onSave: (url: string, reason: string) => void` prop and wire it to `App.tsx` state.

### 2.3 Disabled bottom nav tabs with no explanation
**Location:** `AppBottomNav.tsx:57-60, 83-86`
**Problem:** "보관" and "기록" tabs are disabled with `opacity-40` and `cursor-not-allowed`. Users don't know why or when they'll work.
**Impact:** Feels broken. Users may think the app is buggy.
**Fix Options:**
- (A) Remove disabled tabs entirely, show 3-tab nav
- (B) Add tooltip/toast "곧 추가될 기능이에요" on tap
- (C) Replace with "Coming Soon" badge

### 2.4 No loading state for images
**Location:** `HomeScreen.tsx:58-64`
**Problem:** Images from `picsum.photos` have no skeleton/placeholder while loading. Cards jump in height when images appear.
**Impact:** Content layout shift (CLS); feels janky on slow connections.
**Fix:** Add skeleton placeholder with `aspect-[4/3]` and `bg-surface-subtle animate-pulse` while loading.

---

## 3. Major Issues (Should Fix)

### 3.1 Onboarding Step 1 skip button — tiny touch target
**Location:** `OnboardingScreen.tsx:50-56`
**Problem:** Skip button is bare text "건너뛰기" at `fontSize: 12` with no padding. Effective touch area is roughly 60x16px — well below the 44x44px minimum.
**Impact:** Hard to tap, especially one-handed.
**Fix:** Add `min-h-11 min-w-11 flex items-center justify-center` or at least `px-3 py-2`.

### 3.2 Onboarding uses hardcoded hex instead of semantic tokens
**Location:** `OnboardingScreen.tsx:6-17`
**Problem:** The `C` constant object duplicates colors (`#6A70FF`, `#EEEFFE`, `#3C3489`) that already exist as CSS variables (`--brand`, `--context-box-bg`, `--context-box-text`). Inline `style=` is used throughout.
**Impact:** Dark mode won't apply to onboarding. Brand color changes require two edits.
**Fix:** Replace inline hex with `className` using semantic tokens: `bg-brand`, `text-brand`, `bg-[var(--context-box-bg)]`.

### 3.3 DetailScreen positioning breaks on non-375px viewports
**Location:** `DetailScreen.tsx:28`
**Problem:** `right: '50%'` + `translateX(50%)` / `translateX(calc(50% + 375px))` is fragile. On a wider desktop or when tested in a non-centered layout, the panel won't align correctly.
**Impact:** QA on desktop browser will look broken.
**Fix:** Use the same centering approach as the main app: `left: 50%; transform: translateX(-50%)` for open, and slide off-screen for closed.

### 3.4 No keyboard handling in Onboarding Step 2
**Location:** `OnboardingScreen.tsx:200-212`
**Problem:** URL input has no `onKeyDown` handler for Enter key. Users who press Enter after pasting a URL expect the form to submit.
**Impact:** Friction in the core save flow.
**Fix:** Add `onKeyDown` handler that calls `handleSave` on Enter when `canSave` is true.

### 3.5 Filter bar has no scroll indicator
**Location:** `HomeScreen.tsx:21`
**Problem:** Horizontal filter chips overflow with `overflow-x-auto` and `scrollbar-hide`. Users may not realize there are more filters off-screen.
**Impact:** Filters beyond the viewport are invisible.
**Fix:** Add a fade gradient on the right edge, or show a small arrow/indicator when scrollable content exists.

### 3.6 No empty state on Action screen
**Location:** `ActionScreen.tsx:39-113`
**Problem:** If all cards are marked as done, the screen shows... all cards as faded. There's no congratulatory/motivational state.
**Impact:** Missed opportunity for positive feedback.
**Fix:** Add a completion banner when `done === total` (e.g., "모든 레퍼런스를 활용했어요!").

---

## 4. Minor Issues (Nice to Fix)

### 4.1 Swipe card hint animation never stops on its own
**Location:** `OnboardingScreen.tsx:345-352`
**Problem:** The CSS `@keyframes swipeHint` with `infinite` runs until the user touches. On slower devices, continuous animation drains battery.
**Suggestion:** Stop after 3 cycles using `animation-iteration-count: 3`.

### 4.2 `text-[10px]` in bottom nav may be hard to read
**Location:** `AppBottomNav.tsx:31-34`
**Problem:** 10px text for nav labels is at the edge of legibility, especially for older users.
**Suggestion:** Bump to `text-[11px]` to match the design system's `xs` token.

### 4.3 Close button touch target in SaveBottomSheet
**Location:** `SaveBottomSheet.tsx:50-53`
**Problem:** X button is `size-8` (32x32px) — below the 44px minimum.
**Fix:** Change to `size-10` or add padding.

### 4.4 ConnectPlatform CTA always enabled with 0 selections
**Location:** `ConnectPlatformScreen.tsx:85-89`
**Problem:** The "연동하기" button is active even with 0 platforms selected. The text changes to count but doesn't indicate that 0 is unusual.
**Suggestion:** Consider disabling or changing label to "건너뛰기" when count is 0 (since "나중에 설정할게요" already exists below, this creates two skip paths with different visual weight).

### 4.5 Card images have no alt text variation
**Location:** `HomeScreen.tsx:63`
**Problem:** All image `alt` attributes just use `card.title`. Screen readers will hear the full title twice (once for the button, once for the image).
**Fix:** Use `alt=""` for decorative images (since the title is already in the card body) or use a descriptive variant like `${card.source} reference thumbnail`.

### 4.6 No haptic/visual feedback on swipe threshold
**Location:** `OnboardingScreen.tsx:313-319`
**Problem:** When the user drags past the 80px threshold, there's no distinct "snap" feedback — just a gradual opacity change. Users may not feel confident they've dragged far enough.
**Suggestion:** Add a small scale bump or color intensity change at the threshold crossing.

### 4.7 Textarea in SaveBottomSheet has no character limit indicator
**Location:** `SaveBottomSheet.tsx:79-89`
**Problem:** The "저장 이유" textarea has no maxLength or character counter. Users don't know how long is too long.
**Suggestion:** Add a subtle character count (e.g., `0/100`) below the textarea.

---

## 5. Consistency Audit

| Element | OnboardingScreen | ConnectPlatform | HomeScreen | ActionScreen | DetailScreen | SaveSheet |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| Uses semantic tokens | Partial (hardcoded) | Yes | Yes | Yes | Yes | Yes |
| Dark mode support | No | Yes | Yes | Yes | Yes | Yes |
| 44px touch targets | Partial (skip btn) | Yes | Yes | Partial (circle) | Yes | Partial (X btn) |
| Safe area padding | No | Partial (pb-12) | No | No | No | Yes |
| Focus ring on interactive | No | No | No | No | No | Partial (inputs) |
| aria-labels | No | No | Partial | Yes (circle btn) | No | No |

**Key takeaway:** Onboarding is the most inconsistent screen. It was likely built separately from the main app's component system.

---

## 6. Flow-Level Issues

### 6.1 Onboarding skip goes directly to ConnectPlatform
Steps 1/2/3 all have "건너뛰기" that calls `onComplete`, which goes to ConnectPlatformScreen. This is correct, but:
- Skipping Step 2 means no saved card exists for Step 3's swipe demo
- Skipping Step 3 means the user never learns the swipe gesture
- **Suggestion:** Consider if skip should go directly to main app (bypassing connect screen too), or at minimum, ensure Step 3 handles `card === null` gracefully (currently shows "저장한 레퍼런스" as fallback — OK but not ideal).

### 6.2 No way to re-trigger onboarding from settings
The `localStorage.redo_onboarded` flag is set on connect complete. If a user wants to see onboarding again:
- **Workaround:** `?onboarding=true` URL param exists (good for dev)
- **Suggestion:** Add a "온보딩 다시 보기" option once settings screen is built.

### 6.3 Tab state not persisted across page reload
`currentTab` state resets to `'home'` on every page load. If a user was on the Action tab and refreshed, they'd land on Home.
- **Suggestion:** Persist `currentTab` in `sessionStorage` or URL hash.

### 6.4 No search functionality
The search icon exists in HomeScreen's TopBar (`HomeScreen.tsx:178-180`) but is non-functional — no search input, no handler.
- **Impact:** Users expect clicking the search icon to do something.
- **Fix:** Either wire up search or remove the icon until Phase 2.

---

## 7. Visual Polish Checklist

| Check | Status | Note |
|-------|--------|------|
| Card shadows <=8% opacity | Pass | `--shadow-card: 0 1px 3px rgba(0,0,0,0.04)` |
| No pure black (#000) | Pass | Darkest is `#3C3C3C` |
| Single accent color | Pass | `#6A70FF` consistently used |
| Numbers 2:1 with units | N/A | No metric cards in current scope |
| space-y-6 between sections | Partial | `space-y-3` used for cards (OK for list items) |
| mx-6 / px-6 only | Pass | Consistent `px-6` usage |
| Touch targets >= 44px | Partial | See issues 3.1, 4.2, 4.3 |
| Semantic tokens only | Partial | Onboarding uses hardcoded hex |
| Font sizes from table | Pass | All sizes match design system |

---

## 8. Recommendations Summary

### Priority 1 — Before User Testing
1. Fix `onExecute` toggle (undo support)
2. Wire SaveBottomSheet to actually save cards
3. Handle disabled nav tabs (remove or explain)
4. Add image loading skeletons
5. Fix small touch targets (skip button, X button, circle button)

### Priority 2 — Before Soft Launch
6. Convert Onboarding to semantic tokens (dark mode support)
7. Fix DetailScreen positioning
8. Add Enter key handler in forms
9. Add filter scroll indicator
10. Wire up or remove search icon
11. Add completion state to Action screen

### Priority 3 — Polish
12. Limit swipe hint animation cycles
13. Add character counter to reason textarea
14. Persist tab state across reload
15. Improve alt text for screen readers
16. Add focus rings to all interactive elements
17. Add aria-labels to icon-only buttons

---

## 9. What's Working Well

- **Context box pattern** — "저장 이유" is a unique differentiator, consistently applied across all screens
- **Swipe interaction** — Smooth drag physics with good overlay feedback
- **Visual hierarchy** — Text sizes, weights, and colors create clear reading order
- **Semantic color system** — Well-structured tokens in theme.css with dark mode ready
- **Bottom sheet animation** — Clean slide-up with handle indicator
- **Filter chips** — Active state clearly distinguishable
- **Card design** — Good information density without feeling cramped
- **Progressive disclosure** — Context box hidden in done state on Action screen
- **Onboarding copy** — Warm, conversational Korean tone that matches the brand personality

---

*End of review. Total issues found: 17 (4 critical, 6 major, 7 minor)*

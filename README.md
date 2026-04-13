# ReDo — 레퍼런스 활용 시스템

저장한 레퍼런스를 실제 작업에 활용하는 디자이너용 모바일 웹 앱.

## 주요 기능

- 레퍼런스 저장 (URL + 이유 + 프로젝트 태그)
- 저장 이유(Context Box) 기반 홈 피드
- 실행하기 + 실행 메모 시스템
- AI 기반 레퍼런스 추천
- PWA — 홈 화면 설치 가능
- Supabase 백엔드 연동 (데이터 영구 저장)

---

## 로컬 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 Supabase 값을 입력하세요:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Supabase 없이도 실행 가능합니다** — 환경변수 없이 실행하면 내장 목업 데이터로 동작합니다.

### 3. 개발 서버 시작

```bash
npm run dev
```

`http://localhost:5173` 에서 확인

### 4. 빌드

```bash
npm run build
```

---

## Supabase 설정

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) → 새 프로젝트 생성
2. Settings → API → `URL`과 `anon public` 키 복사
3. `.env.local`에 붙여넣기

### 2. 데이터베이스 스키마 적용

Supabase 대시보드 → SQL Editor에서 `src/lib/schema.sql` 내용을 실행하세요.

---

## Vercel 배포 방법

### 자동 배포 (권장)

1. GitHub에 푸시
2. [vercel.com](https://vercel.com) → 새 프로젝트 → GitHub 저장소 연결
3. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가
4. Deploy

### CLI 배포

```bash
npx vercel --prod
```

---

## PWA 설치

브라우저 주소창 우측의 설치 아이콘을 클릭하거나, iOS Safari에서 "홈 화면에 추가"를 탭하세요.

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | React 18 + TypeScript |
| 빌드 | Vite 6 |
| 스타일 | Tailwind CSS v4 |
| 백엔드 | Supabase (PostgreSQL + Auth) |
| 배포 | Vercel |
| PWA | vite-plugin-pwa |

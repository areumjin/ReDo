# platform-import Edge Function

Pinterest, Notion, Instagram에서 저장된 레퍼런스를 가져오는 함수입니다.

## 배포

```bash
supabase functions deploy platform-import
```

## 요청 형식

```json
{
  "platform": "pinterest" | "notion" | "instagram",
  "token": "ACCESS_TOKEN"
}
```

## 각 플랫폼 토큰 발급 방법

### Pinterest
1. https://developers.pinterest.com/ 접속
2. 앱 생성 → "Access Token" 발급
3. 권한: `boards:read`, `pins:read`

### Notion
1. https://www.notion.so/my-integrations 접속
2. "새 통합 만들기" → Internal Integration Token 복사
3. 가져올 페이지에 통합 연결 필요 (페이지 우상단 ···메뉴 → 연결 추가)

### Instagram
1. https://developers.facebook.com/ 접속
2. Instagram Basic Display API 앱 설정
3. 사용자 토큰 생성

# Wedding Easy Select

웨딩 촬영 원본을 함께 보고 고르는 웨딩 사진 셀렉 서비스입니다.

사진작가는 갤러리를 만들어 사진을 올리고 셀렉 진행 상황을 관찰하며, 부부는 사진을 고르고 별점을 매겨 작가에게 전달합니다. 가족·지인은 게스트 링크로 들어와 좋아요와 댓글로 의견을 보탭니다.

> 현재 저장소는 프론트엔드 UI 프로토타입 단계입니다. 인증, 백엔드 API, 실제 파일 업로드 및 외부 공유 기능은 아직 연결되어 있지 않으며, 화면 데이터는 목업과 `localStorage`를 사용합니다.

## 주요 기능

### 부부 — 셀렉 워크스페이스 (`/gallery`)

- 단일 페이지 워크스페이스: 사이드바 필터(모든 사진 · 선택 사진 · 앨범) × 보기 모드(큰/작은 그리드 · 한 장씩 · 비교)
- 그리드: 줌 배율 조절, 클릭 = 선택 토글, 더블클릭 = 크게 보기
- 한 장씩 보기: 필름스트립(접기 토글 · F 키, 화면 높이에 비례하는 유동 높이) + 사진이 무대 잔여 공간 전부 사용
- 비교 보기: 2장/4장 나란히 비교, 별점 편집
- 우측 패널: 반응(게스트 좋아요·댓글) · 정보(파일 정보 + AI 분석 목업 + 메모·보정 요청)
- 공유 및 초대 모달(권한 · 디자인 · 초대 탭), 선택 사진을 작가에게 전달

### 사진작가 — 스튜디오 (`/galleries`)

- 스튜디오·첫 갤러리 생성 온보딩
- 갤러리 목록: 생성·수정·삭제, 상태 배지(업로드 전 → 셀렉 진행 중 → 완료)와 마감 D-day·지연 표시
- 갤러리 워크스페이스: 부부와 같은 보기 모드 구성이되 셀렉 결과는 읽기 전용 관찰
- 사진 업로드·부부 초대·전달 완료 확인 모달, 부부 보정 요청을 댓글 목록에서 확인

### 게스트 — 공유 링크 (`/guest/[token]`)

- 앨범 표지(부부가 공유 모달에서 설정한 제목·작성자) + 썸네일 그리드 홈
- 사진 보기: 이전/다음 탐색, 활동(댓글 작성) · 정보 패널 토글, 좋아요
- 키보드: ←/→ 이동, ESC 홈 복귀

### 디자인 시스템

- 피그마 컴포넌트 체계와 1:1 대응하는 공용 컴포넌트(`src/components`)
- 디자이너 변수 기반 디자인 토큰(디자인 시스템 v2) — `tokens/*.json`에서 생성 CSS 2개를 만드는 빌드 파이프라인
- 본문·제목 서체 Pretendard Variable (유니코드 범위별 조각 92개를 `public/fonts/pretendard/`에 셀프 호스팅, 출처 orioncactus/pretendard v1.3.9) + 브랜드 워드마크 Montserrat (next/font)

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5 |
| Design tokens | style-dictionary + tokens-studio 변환기 |
| Fonts | Pretendard Variable (동적 서브셋 셀프 호스팅) · Montserrat (next/font) |
| State | React hooks, `useSyncExternalStore` |
| Prototype data | `localStorage`, 정적 목업 데이터 |
| Code quality | ESLint, TypeScript |

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

현재 단계에서는 별도의 환경변수가 필요하지 않습니다.

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 생성 |
| `npm run start` | 프로덕션 빌드 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run tokens:build` | `tokens/*.json` → `tokens.generated.css`(CSS 변수) · `tokens.tailwind.generated.css`(Tailwind 브리지·타이포 유틸) 생성 |
| `npm run icons:build` | Material Symbols Rounded 300 → `src/components/icons.tsx` 생성 |
| `npx tsc --noEmit` | TypeScript 타입 검사 |

디자인 토큰을 수정할 때는 `tokens/*.json`을 고친 뒤 `npm run tokens:build`를 실행합니다. `src/app/tokens.generated.css`와 `tokens.tailwind.generated.css`는 생성 파일이므로 직접 수정하지 않습니다.

## 주요 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 서비스 랜딩 페이지 |
| `/login` | 로그인 (직접 URL 접근·초대 링크용 — 평소엔 랜딩의 모달 사용) |
| `/onboarding/studio` | 사진작가 스튜디오 생성 |
| `/onboarding/gallery` | 첫 샘플 갤러리 생성 온보딩 |
| `/galleries` | 사진작가 갤러리 목록 |
| `/galleries/[galleryId]` | 사진작가 갤러리 워크스페이스 (그리드·싱글·비교) |
| `/gallery` | 부부 셀렉 워크스페이스 (그리드·싱글·비교) |
| `/guest/[token]` | 게스트 공유 앨범 (홈·사진 보기) |
| `/terms` · `/privacy` | 이용약관 · 개인정보 처리방침 (초안) |

상세·비교·앨범 화면은 별도 라우트가 아니라 워크스페이스 페이지 안의 보기 모드로 동작합니다.

## 프로젝트 구조

```text
src/
├─ app/
│  ├─ (auth)/               # 로그인 화면
│  ├─ (couple)/             # 부부 셀렉 워크스페이스
│  ├─ (guest)/              # 게스트 공유 앨범
│  ├─ (legal)/              # 약관·개인정보 처리방침
│  ├─ (photographer)/       # 사진작가 온보딩·갤러리 관리
│  └─ _components/          # 랜딩 페이지 전용 컴포넌트
├─ components/
│  ├─ ui/                   # 버튼·필드·토글 등 기초 부품 (피그마 Components 대응)
│  ├─ app/                  # 툴바·패널·모달 등 워크스페이스 공용 부품
│  ├─ gallery/              # 사진 셀·썸네일·비교 카드
│  ├─ guest/                # 게스트 사이드바·패널
│  └─ photographer/         # 스튜디오 탑바·갤러리 진행 표시
├─ lib/
│  ├─ couple/               # 부부 도메인 목업 데이터·저장소 (사진·별점·반응·공유 설정)
│  ├─ galleries.ts          # 사진작가 갤러리 목업 저장소
│  ├─ localStore.ts         # localStorage와 React 동기화
│  └─ studio.ts             # 스튜디오 정보 목업 저장소
├─ tokens/                  # 디자인 토큰 원본 (global/light/dark)
└─ scripts/build-tokens.mjs # 토큰 → CSS 빌드 스크립트
```

라우트 가까이에 있는 `_components`, `_lib` 폴더는 해당 화면에서만 사용하는 코드입니다. 여러 화면에서 공유하는 UI와 데이터 로직은 각각 `src/components`와 `src/lib`에서 관리합니다.

## 현재 구현 범위

- 로그인 버튼은 실제 OAuth 인증 없이 역할별 화면으로 이동합니다.
- 갤러리·선택·별점·반응 데이터는 브라우저별 `localStorage`에 저장됩니다.
- 업로드 모달은 UI 시연용이며 실제 파일을 서버로 전송하지 않습니다.
- 사진은 실제 이미지 연동 전까지 회색 플레이스홀더로 표시됩니다.
- 게스트 화면은 `/guest/[token]` 직접 접근으로 확인하며, 공유·초대 링크는 시연용 주소입니다.
- 앨범(AI 자동 분류)은 백엔드 연동 전까지 빈 상태입니다.

## 다음 단계

- 백엔드 OAuth 및 세션 연동
- 갤러리·사진·선택 결과 API 연동, 실제 이미지 표시
- 대용량 이미지 업로드 흐름 구현
- 게스트 공유 링크의 서버 기반 발급·접근 제어
- 게스트 화면 모바일 대응
- 핵심 사용자 흐름 자동화 테스트 추가

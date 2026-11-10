# Easy Select

촬영 원본을 함께 보고 고르는 사진 셀렉 서비스의 웹 프론트엔드입니다.

사진작가는 갤러리를 만들어 원본을 올리고, 부부는 사진을 분류하고 골라 보정 요청과 함께 작가에게 전달합니다. 가족 · 친구는 링크로 들어와 좋아요와 댓글로 의견을 보탭니다. 작가 없이 부부가 직접 갤러리를 만들어 쓰는 개인 결제 갤러리도 있습니다.

- 서비스: [https://www.easyselect.kr](https://www.easyselect.kr)
- API 서버: `https://api.easyselect.kr` (백엔드는 별도 저장소)

## 역할

| 역할 | 하는 일 | 들어오는 길 |
| --- | --- | --- |
| 스튜디오 작가 | 스튜디오를 만들고 갤러리마다 원본을 올린 뒤 클라이언트를 초대합니다. 셀렉 결과를 받아 보정본을 올리고 작업을 마무리합니다. | 역할 선택 → `/onboarding/studio` |
| 초대 클라이언트 | 작가가 보낸 초대 링크로 들어와 사진을 컨셉별로 분류하고, 고르고, 보정 요청을 적어 작가에게 전달합니다. 도착한 보정본을 검토합니다. | `/invite/[token]` |
| 개인 결제 클라이언트 | 작가 없이 갤러리를 직접 만들어 사진을 올리고 고릅니다. 무료(계정당 1회) · 프로 플랜이 있고, 쿠폰으로 프로를 등록할 수 있습니다. 파트너 한 명을 초대해 함께 고르고, 고른 결과를 작가에게 넘길 파일(CSV · ZIP)로 내보냅니다. | 역할 선택 → `/onboarding/personal` |
| 게스트 (가족 · 친구) | 클라이언트가 만든 공유폴더 링크로 계정 없이 이름만 정해 들어와 좋아요 · 댓글을 남깁니다. | `/collab/[token]` |

로그인은 구글 · 네이버 · 카카오 OAuth입니다. 한 계정이 여러 스튜디오 · 갤러리에 소속될 수 있고, 소속이 둘 이상이면 로그인 뒤 `/workspace`에서 고릅니다.

### 갤러리 단계

같은 갤러리라도 보는 사람에 따라 단계 이름이 다릅니다.

| 관점 | 단계 |
| --- | --- |
| 스튜디오 작가 | 사진 업로드 → 셀렉 대기 → 보정 작업 → 앨범 구성 → 작업 완료 |
| 초대 클라이언트 | 컨셉 분류 → 셀렉 & 보정 작성 → 보정 검토 → 완료 |
| 개인 결제 클라이언트 | 업로드 → 컨셉 분류 → 셀렉 & 보정 작성 → 보정 확인 → 완료 |

- 보정 요청은 셀렉 단계 안에서 사진에 점을 찍어 적고, 셀렉을 전달할 때 함께 갑니다. 셀렉 ↔ 보정은 보정 횟수만큼 반복됩니다.
- 앨범 구성 단계는 아직 칸만 있습니다(#168).
- 단계 이름과 서버 `stage` 값의 대응은 [`stages.ts`](<src/app/(studio)/studio/gallery/[galleryId]/_shell/stages.ts>)(작가)와 [`clientStages.ts`](<src/app/(client)/gallery/[galleryId]/_shell/clientStages.ts>)(클라이언트)에 있습니다.

## 주요 화면

| 경로 | 묶음 | 화면 |
| --- | --- | --- |
| `/` | — | 서비스 랜딩 |
| `/demo` | `(demo)` | 체험 — 로그인 없이 개인 갤러리 화면을 샘플 사진으로 써 보기 (`/demo/999`로 리라이트) |
| `/login` | `(auth)` | 로그인 (직접 접근 · 초대 링크용, 평소엔 랜딩의 모달) |
| `/login/oauth2/code/[provider]` | `(auth)` | OAuth 콜백 — 주소가 백엔드의 redirect_uri와 맞물려 있음 |
| `/invite/[token]` | `(auth)` | 초대 링크 랜딩 (작가 → 클라이언트, 개인 갤러리 소유자 → 파트너) |
| `/onboarding/role` | `(auth)` | 역할 선택 (스튜디오 / 내 갤러리) |
| `/onboarding/personal` · `/coupon` · `/gallery` | `(auth)` | 개인 갤러리 만들기 (플랜 선택 · 쿠폰 등록 · 갤러리 정보) |
| `/workspace` | `(auth)` | 내 소속(스튜디오 · 갤러리) 목록 |
| `/settings` | `(auth)` | 설정 (계정 · 스튜디오별 · 개인 갤러리) |
| `/onboarding/studio` | `(studio)` | 스튜디오 만들기 |
| `/studio` | `(studio)` | 가장 최근 활동한 스튜디오로 이동 |
| `/studio/[studio]` | `(studio)` | 스튜디오 홈 (갤러리 목록) |
| `/studio/gallery/[galleryId]` | `(studio)` | 작가 갤러리 |
| `/gallery` | `(client)` | 초대 수락한 첫 갤러리로 이동 |
| `/gallery/[galleryId]` | `(client)` | 클라이언트 갤러리 (초대 · 개인 결제 공용) |
| `/collab/[token]` | `(guest)` | 게스트 화면 |
| `/terms` · `/privacy` | `(legal)` | 이용약관 · 개인정보 처리방침 |

단계 · 보기 모드 · 크게 보기는 별도 라우트가 아니라 갤러리 페이지 안에서 바뀝니다.

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5 |
| Auth | 백엔드 OAuth(구글 · 네이버 · 카카오) — access 토큰은 메모리, refresh 토큰은 `localStorage` |
| Data | 백엔드 REST API (`src/lib/api`의 fetch 래퍼) |
| Upload | Web Worker 리사이즈(긴 변 2048px) · CRC32C 체크섬 · zip.js(분할 ZIP 읽기) |
| Download | JSZip (보정본 묶음 내려받기) |
| Analytics | Amplitude, Vercel Analytics |
| Design tokens | style-dictionary + tokens-studio 변환기 |
| Icons | Material Symbols Rounded 300 → 생성 컴포넌트 |
| Fonts | Pretendard Variable (동적 서브셋 셀프 호스팅) · Montserrat (next/font) |
| Deploy | GitHub Actions → Vercel |
| Code quality | ESLint, TypeScript, `node:test` |

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 생성 |
| `npm run start` | 프로덕션 빌드 실행 |
| `npm run lint` | ESLint 검사 |
| `npx tsc --noEmit` | TypeScript 타입 검사 |

## 프로젝트 구조

```text
src/
├─ app/
│  ├─ (auth)/               # 로그인 · OAuth 콜백 · 초대 링크 · 온보딩 · 워크스페이스 · 설정
│  ├─ (studio)/             # 작가 — 스튜디오 온보딩 · 스튜디오 홈 · 갤러리
│  ├─ (client)/             # 클라이언트 갤러리 (초대 · 개인 결제)
│  ├─ (guest)/              # 게스트 링크 화면
│  ├─ (demo)/               # 체험 페이지
│  ├─ (legal)/              # 이용약관 · 개인정보 처리방침
│  ├─ _components/          # 랜딩 페이지 전용 컴포넌트
│  └─ fonts/                # Pretendard @font-face
├─ components/
│  ├─ ui/                   # 버튼 · 입력란 · 토글 등 기초 부품 (피그마 Components 대응)
│  ├─ app/                  # 프로필 메뉴 · 알림 · 크게 보기 · 코치마크 · 스낵바 등 화면 공용 부품
│  ├─ photographer/         # 스튜디오 헤더 · 갤러리 진행 표시
│  └─ *.tsx                 # 로그인 모달 · 인증 부트스트랩 · 아이콘(생성 파일) 등
├─ lib/
│  ├─ api/                  # 백엔드 API 모듈 — client.ts가 토큰 주입 · 재발급 · 에러 정규화
│  ├─ auth/                 # 토큰 보관 · 세션 복구 · 로그인 흐름 · 로그아웃
│  ├─ upload/               # 업로드 전처리 — 리사이즈 워커 · CRC32C · EXIF · 분할 ZIP
│  ├─ analytics/            # 이벤트 트래킹 래퍼 (앰플리튜드 / 콘솔 어댑터)
│  ├─ demo/                 # 체험 모드용 브라우저 안 가짜 서버
│  ├─ localStore.ts         # localStorage ↔ React 동기화 헬퍼
│  ├─ galleries.ts          # 목업 시절에서 남은 로컬 캐시 (새 코드에서 쓰지 않음)
│  ├─ studio.ts             # 스튜디오 이름 로컬 캐시 (스튜디오 홈 · 설정)
│  └─ …                     # 쿠폰 링크 · 테마 · 사이드바 등 작은 공용 모듈
└─ instrumentation-client.ts  # 분석 초기화 · 페이지 이동 이벤트
tokens/                     # 디자인 토큰 원본 (global · light · dark)
scripts/                    # 토큰 · 아이콘 빌드 스크립트, node:test 테스트
public/fonts/pretendard/    # Pretendard 유니코드 범위별 조각
```

- 라우트 가까이에 있는 `_components` · `_lib` · `_shell` 폴더는 그 화면에서만 쓰는 코드입니다. 여러 화면이 공유하는 UI와 로직은 각각 `src/components`와 `src/lib`에 둡니다.
- 갤러리 화면의 부품(상단바 · 폴더 열 · 그리드 · 하단 바 등)은 작가 쪽 `studio/gallery/[galleryId]/_shell/`에 있고, 클라이언트 갤러리가 이를 가져다 씁니다.
- 체험 모드(`/demo`)에서는 `lib/api/client.ts`가 fetch 대신 `lib/demo`의 가짜 서버에 묻기 때문에, 화면 코드는 실제 갤러리와 같습니다.

## 배포

- `main`에 푸시(머지)하면 [`.github/workflows/vercel-production.yml`](.github/workflows/vercel-production.yml)이 Vercel CLI로 pull → build → deploy를 실행해 프로덕션에 올립니다.
- 빌드 환경변수는 Vercel 프로젝트의 Production 환경변수에서 가져옵니다. `NEXT_PUBLIC_*` 값을 바꾸면 다시 배포해야 반영됩니다.

## 디자인 시스템

- 공용 컴포넌트는 피그마 컴포넌트 체계와 1:1로 대응합니다(`src/components/ui`).
- 디자인 토큰은 `tokens/*.json`이 원본입니다. 고친 뒤 `npm run tokens:build`를 실행합니다. `src/app/tokens.generated.css`와 `tokens.tailwind.generated.css`는 생성 파일이므로 직접 수정하지 않습니다.
- 아이콘은 `npm run icons:build`가 Material Symbols Rounded 300에서 만든 `src/components/icons.tsx`를 씁니다. 피그마의 아이콘 이름과 같은 이름을 씁니다.
- 라이트 · 다크 테마를 지원합니다.
- 서체는 본문 · 제목 Pretendard Variable(유니코드 범위별 조각 92개를 `public/fonts/pretendard/`에 셀프 호스팅, 출처 orioncactus/pretendard v1.3.9)과 브랜드 워드마크 Montserrat(next/font)입니다.

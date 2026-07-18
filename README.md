# Wedding Easy Select

웨딩 촬영 원본을 장면과 인물별로 정리하고, 부부와 사진작가가 선택 결과를 공유할 수 있도록 돕는 웨딩 사진 셀렉 서비스입니다.

사진작가는 갤러리를 만들고 사진 및 셀렉 진행 상황을 관리하며, 부부는 분류된 사진을 검토해 최종 선택 앨범과 협업 셀렉을 구성할 수 있습니다.

> 현재 저장소는 프론트엔드 UI 프로토타입 단계입니다. 인증, 백엔드 API, 실제 파일 업로드 및 외부 공유 기능은 아직 연결되어 있지 않으며, 화면 데이터는 목업과 `localStorage`를 사용합니다.

## 주요 기능

### 사진작가

- 스튜디오 및 첫 갤러리 생성 온보딩
- 갤러리 생성, 수정, 삭제 및 상태 필터링
- 갤러리별 사진, 최종 선택본, 셀렉 현황 확인
- 사진 업로드 및 부부 초대 흐름 시연
- 마감일과 선택 진행 상태 확인

### 부부

- 장면과 인물 조합으로 분류된 카테고리 갤러리 탐색
- 사진을 `후보`, `고민중`, `제외`로 분류
- 선택 앨범 구성 및 작가 전달 흐름
- 분류별 미리보기와 폴더별 진행 현황 확인
- 사진별 메모, 보정 요청 및 조회 기록 관리

### 협업 셀렉

- 원하는 사진을 협업 폴더에 추가
- 협업 폴더 생성, 수정 및 삭제
- 사진별 반응과 댓글 확인
- 공유 및 투표 링크 생성 흐름 시연

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5 |
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
| `npx tsc --noEmit` | TypeScript 타입 검사 |

## 주요 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 서비스 랜딩 페이지 |
| `/login` | 역할별 로그인 UI |
| `/onboarding/studio` | 사진작가 스튜디오 생성 |
| `/onboarding/gallery` | 첫 샘플 갤러리 생성 온보딩 |
| `/galleries` | 사진작가 갤러리 목록 |
| `/galleries/[galleryId]` | 사진작가 갤러리 상세 |
| `/gallery` | 부부 카테고리 갤러리 |
| `/gallery/[folderKey]` | 카테고리 폴더별 사진 셀렉 |
| `/gallery/compare-results` | 사진 분류 결과 |
| `/selected` | 최종 선택 앨범 |
| `/collaboration` | 협업 셀렉 폴더 목록 |
| `/collaboration/[folderId]` | 협업 셀렉 상세 |

## 프로젝트 구조

```text
src/
├─ app/
│  ├─ (auth)/               # 로그인 화면
│  ├─ (couple)/             # 부부용 갤러리와 협업 셀렉
│  ├─ (photographer)/       # 사진작가 온보딩과 갤러리 관리
│  └─ _components/          # 랜딩 페이지 전용 컴포넌트
├─ components/              # 여러 라우트에서 사용하는 공용 UI
└─ lib/
   ├─ couple/               # 부부 도메인 목업 데이터와 저장소
   ├─ galleries.ts          # 사진작가 갤러리 목업 저장소
   ├─ localStore.ts         # localStorage와 React 동기화
   └─ studio.ts             # 스튜디오 정보 목업 저장소
```

라우트 가까이에 있는 `_components`, `_hooks`, `_lib` 폴더는 해당 화면에서만 사용하는 코드입니다. 여러 화면에서 공유하는 UI와 데이터 로직은 각각 `src/components`와 `src/lib`에서 관리합니다.

## 현재 구현 범위

- 로그인 버튼은 실제 OAuth 인증 없이 역할별 화면으로 이동합니다.
- 갤러리와 사진 선택 데이터는 브라우저별 `localStorage`에 저장됩니다.
- 업로드 모달은 UI 시연용이며 실제 파일을 서버로 전송하지 않습니다.
- 초대, 공유, 투표 링크는 UI 시연용 주소이며 외부 사용자는 데이터를 공유받을 수 없습니다.
- 사진은 프로토타입 표시를 위해 외부 이미지 URL을 사용합니다.

## 다음 단계

- 백엔드 OAuth 및 세션 연동
- 갤러리, 사진, 선택 결과 API 연동
- 대용량 이미지 업로드 흐름 구현
- 초대 및 협업 링크의 서버 기반 공유 구현
- 이미지 최적화와 접근성 보완
- 핵심 사용자 흐름 자동화 테스트 추가

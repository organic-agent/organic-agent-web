/**
 * 업로드 마스터 규격 — 브라우저에서 줄여 올리는 JPEG의 크기·품질
 * 위치: src/lib/upload/masterSpec.ts
 *
 * 긴 변 2048이면 화면·미리보기·AI 분석(임베딩·점수)에 충분하고, 원본(24MP, 8~12MB)의
 * 1/20 정도라 수천 장 업로드가 몇 배 빨라진다. 원본은 작가의 로컬에 남는다.
 */
export const MASTER_LONG_EDGE = 2048;
export const MASTER_JPEG_QUALITY = 0.85;
/** 동시에 띄우는 리사이즈 워커 상한 — 코어 수 - 1까지 */
export const MASTER_RESIZE_WORKERS_MAX = 6;
/**
 * 발급은 리사이즈 뒤에만 받을 수 있다(서명에 Content-Length가 들어간다). 이 장수씩 리사이즈해
 * 한 번에 발급받고, 그 묶음을 올리는 동안 다음 묶음을 줄인다. 서버 상한은 500이지만 500을
 * 채우려면 blob 150MB를 들고 8초를 기다려야 첫 PUT이 나간다 — 100이면 30MB 안팎이다.
 */
export const UPLOAD_ISSUE_BATCH = 100;
/** S3 PUT 동시 수 — 같은 호스트에 브라우저 연결 6이 상한이고, 6이면 회선(75Mbps)을 이미 넘는다 */
export const UPLOAD_PUT_CONCURRENCY = 6;
/** 완료 통보 묶음 — 서버 스윕이 5초 주기라 50장이면 첫 임베더 배치가 곧 뜬다 */
export const UPLOAD_COMPLETE_BATCH = 50;
/** PUT 실패 뒤 재시도 간격(ms). 같은 키 재PUT은 멱등이다 */
export const UPLOAD_PUT_RETRY_MS = [500, 1000, 2000, 4000];

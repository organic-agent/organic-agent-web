/**
 * 작가 — 갤러리 폼 유틸
 * 위치: src/app/(photographer)/_lib/galleryForm.ts
 *
 * 갤러리 생성/온보딩에서 공유하는 입력값 형태와 검증 규칙을 모은다.
 * 필드는 생성 계약(POST /api/v1/galleries)이 받는 세 값과 1:1이다 —
 * 컨셉 개수·메모는 기획에서 제거됐다(WES-21 결정).
 *
 * 주요 책임:
 * - 갤러리 폼 기본값 생성
 * - 저장 가능 여부 검증
 */

export type GalleryFormValues = {
  name: string;
  /** YYYY-MM-DD. 빈 문자열이면 기한 없음(서버 null). */
  dueDate: string;
  /** 계약 장수. 빈 문자열이면 제한 없음(서버 null). */
  target: string;
};

/** 오늘 기준 +days일을 <input type="date"> 값(YYYY-MM-DD)으로 반환 */
export function addDaysAsInputValue(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDefaultGalleryForm(): GalleryFormValues {
  // 마감 기한·계약 장수는 선택 입력 — 비워두면 서버에 null로 간다
  return { name: "", dueDate: "", target: "" };
}

/** 지난 마감 기한인지 — 서버가 400으로 거절하므로 제출 전에 막는다. */
export function isPastDueDate(dueDate: string) {
  return dueDate.length > 0 && dueDate < addDaysAsInputValue(0);
}

export function isGalleryFormValid(values: GalleryFormValues) {
  const targetValid =
    values.target.trim() === "" || Number(values.target) > 0;
  return (
    values.name.trim().length > 0 && !isPastDueDate(values.dueDate) && targetValid
  );
}

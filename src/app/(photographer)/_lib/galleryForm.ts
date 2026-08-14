/**
 * 작가 — 갤러리 폼 유틸
 * 위치: src/app/(photographer)/_lib/galleryForm.ts
 *
 * 갤러리 생성/수정/온보딩에서 공유하는 입력값 형태와 검증 규칙을 모은다.
 * UI는 달라도 저장 기준은 같은 규칙을 사용하도록 한다.
 *
 * 주요 책임:
 * - 갤러리 폼 기본값 생성
 * - 저장 가능 여부 검증
 * - 폼 값과 Gallery 데이터 간 변환
 */

import type { Gallery } from "@/lib/galleries";

export type GalleryFormValues = {
  name: string;
  dueDate: string;
  target: string;
  concept: string;
  memo: string;
};

export type GalleryFormPatch = Pick<
  Gallery,
  "couple" | "dueDate" | "target" | "conceptCount" | "memo"
>;

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
  return {
    name: "",
    dueDate: addDaysAsInputValue(50),
    target: "50",
    concept: "",
    memo: "",
  };
}

export function galleryToFormValues(gallery: Gallery): GalleryFormValues {
  return {
    name: gallery.couple,
    dueDate: gallery.dueDate,
    target: String(gallery.target),
    concept: gallery.conceptCount ? String(gallery.conceptCount) : "",
    memo: gallery.memo,
  };
}

export function isGalleryFormValid(values: GalleryFormValues) {
  return (
    values.name.trim().length > 0 &&
    values.dueDate.length > 0 &&
    Number(values.target) > 0
  );
}

export function toGalleryFormPatch(values: GalleryFormValues): GalleryFormPatch {
  return {
    couple: values.name.trim(),
    dueDate: values.dueDate,
    target: Number(values.target),
    conceptCount: values.concept.trim() ? Number(values.concept) : undefined,
    memo: values.memo.trim(),
  };
}

export function createGalleryFromForm({
  values,
  id,
}: {
  values: GalleryFormValues;
  id: string;
}): Gallery {
  const patch = toGalleryFormPatch(values);

  return {
    id,
    couple: patch.couple,
    dueDate: patch.dueDate,
    // 초상권 문제로 저장소에 사진 URL을 두지 않는다 — 커버는 업로드 연동 후 채워진다
    cover: "",
    total: 0,
    selected: 0,
    target: patch.target,
    conceptCount: patch.conceptCount,
    memo: patch.memo,
    invited: false,
    uploaded: false,
    selectionSubmittedAt: null,
    delivered: false,
    hasPendingCorrectionRequest: false,
  };
}

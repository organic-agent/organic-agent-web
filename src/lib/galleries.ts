/**
 * 작가 갤러리 목업 저장소 (localStorage 기반)
 * 위치: src/lib/galleries.ts
 *
 * 목록/상세 페이지가 같은 데이터를 공유하도록 공용으로 뺀 목업이다. 나중에 API를 붙일 땐 이 파일 안의 함수 구현만 fetch로 바꾸면 된다.
 */

import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

export type GalleryStage =
  | "업로드 전"
  | "초대 전"
  | "셀렉 진행 중"
  | "셀렉 완료"
  | "전달 완료";

export const GALLERY_STAGES: GalleryStage[] = [
  "업로드 전",
  "초대 전",
  "셀렉 진행 중",
  "셀렉 완료",
  "전달 완료",
];

export type Gallery = {
  id: string;
  couple: string; // 갤러리 이름
  dueDate: string; // 선택 마감일 (YYYY-MM-DD)
  cover: string;
  total: number;
  selected: number;
  target: number;
  conceptCount?: number; // AI 장면 분류 힌트 (선택, 없으면 미지정)
  memo: string;
  invited: boolean; // 부부에게 초대를 보냈는지
  uploaded: boolean; // 작가가 원본을 업로드했는지
  selectionSubmittedAt: string | null; // 부부가 "작가에게 전달"을 실제로 누른 시각(ISO). 안 했으면 null
  delivered: boolean; // 작가가 보정본 전달을 완료 처리했는지
  hasPendingCorrectionRequest: boolean; // 처리 안 된 보정 요청이 있는지 (선형 단계와 별개)
};

const STORAGE_KEY = "wes.galleries";

// 데모용 목업 4개 — 상태 다양성을 보여주려고 일부러 각각 다른 단계로 둔다:
//   민준 & 서연: 셀렉 진행 중 (마감 여유 있음, 순조롭게 진행)
//   지호 & 하은: 업로드 전 (마감 여유 있음)
//   도윤 & 수아: 마감 임박·거의 완료 (셀렉 진행 중)
//   시우 & 지우: 마감 지연 (셀렉 진행 중인데 선택이 더딘 상황)
// selected는 부부가 고른 장수라 target(목표 장수)을 넘지 않게 둔다.
const SEED_GALLERIES: Gallery[] = [
  {
    id: "1",
    couple: "민준 & 서연",
    dueDate: "2026-08-30",
    // 초상권 문제로 저장소에 사진 URL을 두지 않는다 — 실커버는 깃허브 공개 후 로컬에서만 연결
    cover: "",
    total: 842,
    selected: 34,
    target: 50,
    memo: "",
    invited: true,
    uploaded: true,
    selectionSubmittedAt: null,
    delivered: false,
    hasPendingCorrectionRequest: false,
  },
  {
    id: "2",
    couple: "지호 & 하은",
    dueDate: "2026-08-20",
    cover: "",
    total: 0,
    selected: 0,
    target: 50,
    memo: "",
    invited: false,
    uploaded: false,
    selectionSubmittedAt: null,
    delivered: false,
    hasPendingCorrectionRequest: false,
  },
  {
    id: "3",
    couple: "도윤 & 수아",
    dueDate: "2026-07-13",
    cover: "",
    total: 640,
    selected: 41,
    target: 50,
    memo: "",
    invited: true,
    uploaded: true,
    selectionSubmittedAt: null,
    delivered: false,
    hasPendingCorrectionRequest: false,
  },
  {
    id: "4",
    couple: "시우 & 지우",
    dueDate: "2026-07-06",
    cover: "",
    total: 918,
    selected: 18,
    target: 50,
    memo: "",
    invited: true,
    uploaded: true,
    selectionSubmittedAt: null,
    delivered: false,
    hasPendingCorrectionRequest: false,
  },
];

/**
 * 실제 액션(업로드→초대→제출→전달 처리)만으로 계산하는 선형 단계.
 * 마감일(dueDate)로는 계산하지 않는다 — "마감일이 지남"은 "시간이 다 됨"일 뿐
 * "부부가 다 골랐음"이 아니기 때문이다. (보정 요청은 이 선형 단계와 별개의
 * 플래그로, 카드 배지에서만 getGalleryBadge가 덮어쓴다.)
 */
function computeStage(
  gallery: Pick<
    Gallery,
    "uploaded" | "invited" | "selectionSubmittedAt" | "delivered"
  >,
): GalleryStage {
  if (gallery.delivered) return "전달 완료";
  if (gallery.selectionSubmittedAt) return "셀렉 완료";
  if (gallery.invited) return "셀렉 진행 중";
  if (gallery.uploaded) return "초대 전";
  return "업로드 전";
}

/**
 * 카드 배지용 표시 라벨. 보정 요청이 있고 아직 전달 전이면
 * "셀렉 완료" 자리를 "보정 요청 있음"으로 덮어써서 배지를 하나만 보여준다.
 */
export function getGalleryBadge(gallery: Gallery): {
  label: string;
  isCorrection: boolean;
} {
  const stage = computeStage(gallery);
  if (gallery.hasPendingCorrectionRequest && stage !== "전달 완료") {
    return { label: "보정 요청 있음", isCorrection: true };
  }
  return { label: stage, isCorrection: false };
}

type OverdueGallery = Pick<
  Gallery,
  "uploaded" | "invited" | "selectionSubmittedAt" | "delivered" | "dueDate"
>;

/**
 * 마감일까지 남은/지난 일수(부호 있음). 음수면 마감 전(남은 일수 = D-day),
 * 0이면 당일 마감, 양수면 마감을 지난 일수다. 이미 끝난(셀렉 완료·전달 완료)
 * 갤러리는 마감을 따질 대상이 아니라 undefined.
 */
function computeDueOffset(
  gallery: OverdueGallery,
  now: Date,
): number | undefined {
  const stage = computeStage(gallery);
  if (stage === "셀렉 완료" || stage === "전달 완료") return undefined;
  const due = new Date(gallery.dueDate);
  due.setHours(23, 59, 59, 999); // 마감일 당일까지는 여유 있음으로 침
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 배지 옆에 덧붙일 마감 문구. 마감 전이면 "D-N"(남은 일수), 당일이면 "오늘 마감",
 * 지난 뒤면 "N일 지연"으로 마감 전→후가 하나의 연속된 타임라인으로 이어진다.
 * 업로드 전·초대 전·셀렉 진행 중에만 표시하고, 이미 끝난 갤러리엔 표시하지 않는다.
 */
export function getOverdueLabel(
  gallery: OverdueGallery,
  now: Date = new Date(),
): string | undefined {
  const offset = computeDueOffset(gallery, now);
  if (offset === undefined) return undefined;
  if (offset > 0) return `${offset}일 지연`;
  if (offset === 0) return "오늘 마감";
  return `D-${-offset}`;
}

const galleriesStore = createLocalStore<Gallery[]>(STORAGE_KEY, SEED_GALLERIES);

/** 화면에서 실시간으로 반영되어야 할 때 (컴포넌트 안에서만 호출) */
export function useGalleries(): Gallery[] {
  return useSyncExternalStore(
    galleriesStore.subscribe,
    galleriesStore.get,
    galleriesStore.getServerSnapshot,
  );
}

/** 특정 갤러리 하나만 갱신하고 저장소에 반영한다. */
export function updateGallery(
  id: string,
  patch: Partial<Gallery>,
): Gallery[] {
  const next = galleriesStore.get().map((g) =>
    g.id === id ? { ...g, ...patch } : g,
  );
  galleriesStore.set(next);
  return next;
}

/** id가 같으면 덮어쓰고, 없으면 맨 앞에 추가한다. */
export function upsertGallery(gallery: Gallery): Gallery[] {
  const rest = galleriesStore.get().filter((g) => g.id !== gallery.id);
  const next = [gallery, ...rest];
  galleriesStore.set(next);
  return next;
}

/** 특정 갤러리를 목록에서 제거한다. */
export function deleteGallery(id: string): Gallery[] {
  const next = galleriesStore.get().filter((g) => g.id !== id);
  galleriesStore.set(next);
  return next;
}

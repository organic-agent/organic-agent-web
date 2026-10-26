/**
 * 랜딩 · 체험용 샘플 사진 — 고정 데이터
 * 위치: src/app/_components/shots/samplePhotos.ts
 *
 * public/images/demo/w0001.jpg ~ w0250.jpg (1024×1536 JPEG, 팀이 만든 목업 사진 250장). 원본 데이터셋은 같은 커플 ·
 * 같은 스튜디오를 카메라 구도 10묶음 × 25장으로 만든 것이라, 구도 묶음을 네 폴더(전신 · 상반신 · 클로즈업 · 풍경)로 합쳐
 * AI 컨셉 분류가 나눈 것처럼 보이게 한다. 서버 응답 모양(PhotoResponse)으로 만들어 두어 실제 사진 그리드 부품에
 * 그대로 넣는다. photoId는 데이터셋 번호(1~250)와 같다. 랜딩 화면은 폴더마다 앞 몇 장만(landingPhotos), 체험 페이지는
 * 전부(SAMPLE_PHOTOS) 쓴다.
 */

import type { PhotoResponse } from "@/lib/api/photos";

export type SampleFolder = {
  /** 폴더 이름(화면에 보임) */
  name: string;
  /** 데이터셋 번호 구간(양 끝 포함) — 원본의 카메라 구도 묶음 */
  ranges: [number, number][];
};

export const SAMPLE_FOLDERS: SampleFolder[] = [
  { name: "전신", ranges: [[1, 25], [76, 100], [126, 150], [201, 225]] },
  { name: "상반신", ranges: [[26, 50], [151, 175], [226, 250]] },
  { name: "클로즈업", ranges: [[51, 75], [176, 200]] },
  { name: "풍경", ranges: [[101, 125]] },
];

/** 폴더의 사진 번호 전부(구간 순서대로) */
export function sampleIdsOf(folder: SampleFolder): number[] {
  return folder.ranges.flatMap(([from, to]) => Array.from({ length: to - from + 1 }, (_, i) => from + i));
}

/** 사진 번호 → 파일 이름(확장자 제외) · 주소 */
export function sampleFile(id: number): string {
  return `w${String(id).padStart(4, "0")}`;
}
export function samplePhotoUrl(id: number): string {
  return `/images/demo/${sampleFile(id)}.jpg`;
}

/** 사진이 든 폴더 번호(0~3) — 없는 번호는 0 */
export function sampleFolderIndexOf(photoId: number): number {
  const i = SAMPLE_FOLDERS.findIndex((f) => f.ranges.some(([from, to]) => photoId >= from && photoId <= to));
  return i < 0 ? 0 : i;
}
export function sampleFolderOf(photoId: number): SampleFolder {
  return SAMPLE_FOLDERS[sampleFolderIndexOf(photoId)];
}

/** 보여 주기용 별점 — photoId → 1~5. 랜딩 셀렉 화면과 체험에서 같이 쓴다 */
export const SAMPLE_SCORES: Record<number, number> = { 1: 5, 2: 4, 5: 4, 26: 5, 28: 4, 51: 3, 52: 5, 101: 4, 103: 5 };

function toPhoto(id: number, displayOrder: number): PhotoResponse {
  return {
    photoId: id,
    storageKey: `demo/${sampleFile(id)}.jpg`,
    originalFileName: `IMG_${String(id).padStart(4, "0")}.jpg`,
    contentType: "image/jpeg",
    status: "UPLOADED",
    displayOrder,
    createdAt: null,
    viewUrl: samplePhotoUrl(id),
    previewReady: true,
    score: SAMPLE_SCORES[id] ?? null,
  };
}

/** 250장 전부 — 폴더 순서대로 이어 붙인 목록(체험 페이지용) */
export const SAMPLE_PHOTOS: PhotoResponse[] = SAMPLE_FOLDERS.flatMap((folder) => sampleIdsOf(folder)).map(toPhoto);

/** 폴더마다 앞 perFolder장만 — 랜딩 화면 4장용(기본 6장 × 4폴더 = 24장) */
export function landingPhotos(perFolder = 6): PhotoResponse[] {
  return SAMPLE_FOLDERS.flatMap((folder) => sampleIdsOf(folder).slice(0, perFolder)).map(toPhoto);
}

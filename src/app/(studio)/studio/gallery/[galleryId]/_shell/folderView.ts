/**
 * 폴더 트리 화면용 정규화와 중복 컨셉 합치기
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/folderView.ts
 *
 * 정규화: 서버의 세부 폴더 photoIds는 순서가 없고 휴지통 사진도 섞여 온다 — 살아 있는 사진만 남기고
 * 업로드 순으로 정렬한다. "검토 완료"로 표시한(브라우저 기억) 폴더의 needsReview는 감춘다.
 *
 * 중복 컨셉: 사진을 더 올려 다시 분석하면 서버가 같은 이름의 컨셉 폴더를 뒤에 덧붙인다(2026-09-11 실측,
 * 백엔드 요청 항목). 그때까지는 화면이 정리한다 — 같은 이름 컨셉 중 가장 앞의 것을 남기고, 나머지의 세부 폴더
 * 사진을 같은 이름 세부 폴더로 옮긴 뒤(없으면 만들고) 빈 컨셉을 지운다. 만들기 · 이동 · 삭제 API만 쓴다.
 */

import {
  createDetailFolder,
  deleteConceptFolder,
  moveCategoryPhotos,
  type ConceptFolderResponse,
} from "@/lib/api/conceptFolders";
import type { PhotoResponse } from "@/lib/api/photos";

const MOVE_BATCH = 500;

export function normalizeFolders(
  raw: ConceptFolderResponse[],
  livePhotos: PhotoResponse[],
  reviewedIds: Set<number>,
): ConceptFolderResponse[] {
  const live = new Map(livePhotos.map((p) => [p.photoId, p]));
  const order = (a: number, b: number) => {
    const pa = live.get(a)!;
    const pb = live.get(b)!;
    return pa.displayOrder - pb.displayOrder || pa.photoId - pb.photoId;
  };
  return raw.map((concept) => ({
    ...concept,
    details: concept.details.map((detail) => ({
      ...detail,
      needsReview: detail.needsReview && !reviewedIds.has(detail.id),
      photoIds: detail.photoIds.filter((id) => live.has(id)).sort(order),
    })),
  }));
}

/** 같은 이름(공백 제외)의 컨셉 묶음 — 앞에 있는 것(sortOrder · id 작은 것)이 첫 원소 */
export function duplicateConceptGroups(folders: ConceptFolderResponse[]): ConceptFolderResponse[][] {
  const byName = new Map<string, ConceptFolderResponse[]>();
  for (const concept of folders) {
    const key = concept.name.trim();
    byName.set(key, [...(byName.get(key) ?? []), concept]);
  }
  return [...byName.values()]
    .filter((group) => group.length > 1)
    .map((group) => [...group].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
}

/**
 * 중복 컨셉을 합친다. 정규화된(살아 있는 사진만 있는) 폴더를 넣어야 이동이 거절되지 않는다.
 * 돌려주는 값은 지운 컨셉 수.
 */
export async function mergeDuplicateConcepts(
  galleryId: number,
  folders: ConceptFolderResponse[],
): Promise<number> {
  let merged = 0;
  for (const group of duplicateConceptGroups(folders)) {
    const [keeper, ...rest] = group;
    const keeperDetails = new Map(keeper.details.map((d) => [d.name.trim(), d]));
    for (const concept of rest) {
      for (const detail of concept.details) {
        if (detail.photoIds.length > 0) {
          let target = keeperDetails.get(detail.name.trim());
          if (!target) {
            target = await createDetailFolder(galleryId, keeper.id, detail.name);
            keeperDetails.set(detail.name.trim(), target);
          }
          for (let i = 0; i < detail.photoIds.length; i += MOVE_BATCH) {
            await moveCategoryPhotos(galleryId, detail.photoIds.slice(i, i + MOVE_BATCH), target.id);
          }
        }
      }
      await deleteConceptFolder(galleryId, concept.id);
      merged += 1;
    }
  }
  return merged;
}

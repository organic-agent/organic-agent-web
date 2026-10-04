/**
 * 폴더 트리 화면용 정규화
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/folderView.ts
 *
 * 서버의 세부 폴더 photoIds는 순서가 없고 휴지통 사진도 섞여 온다 — 살아 있는 사진만 남기고
 * 업로드 순으로 정렬한다. "검토 완료"로 표시한(브라우저 기억) 폴더의 needsReview는 감춘다.
 *
 * 나눠 올린 사진을 다시 분석해도 같은 컨셉이 두 폴더로 갈리지 않는다 — 서버가 옛 사진이 있는 폴더를 따라
 * 기존 폴더에 합친다(server #217 · #219). 화면이 하던 같은 이름 컨셉 합치기는 그래서 없앴다.
 */

import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { PhotoResponse } from "@/lib/api/photos";

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

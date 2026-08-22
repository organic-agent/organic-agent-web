/**
 * 자동 분류(클러스터)·앨범(폴더) API — 스웨거 [PhotoCluster]·[PhotoFolder] 계약의 타입화
 * 위치: src/lib/api/folders.ts
 *
 * 분류 파라미터는 서버가 소유한다: 클라이언트는 "묶는 정도" 레벨(1=크게 묶기
 * ~ 5=잘게 묶기) 하나만 보내고, 유사도 임계값·촬영 시각 창은 서버 몫이다.
 * 마음에 든 묶음은 폴더로 고정한다 — 폴더는 클러스터를 가리키는 포인터가
 * 아니라 고정 시점의 사진 목록(스냅샷)이라, 이후 재분류에 영향받지 않는다.
 */

import { api } from "@/lib/api/client";
import type { PhotoResponse } from "@/lib/api/photos";

export type PhotoClusterResponse = {
  /** 묶음에 든 사진 수 — photos.length와 같다 */
  size: number;
  /** 갤러리 노출 순서를 따른다 — 첫 장이 대표다 */
  photos: PhotoResponse[];
};

export type PhotoClustersResponse = {
  /** 실제 적용된 레벨(1~5) — 요청에서 생략하면 서버 기본값이 온다 */
  level: number;
  /** 큰 묶음부터. 혼자 남은 사진도 크기 1짜리 묶음으로 들어 있다. */
  clusters: PhotoClusterResponse[];
  /** 임베딩이 없어 어느 묶음에도 못 들어간 사진 수 — 0이 아니면 분석 진행 중 */
  unclassified: number;
};

/**
 * 유사도 묶음 조회 — 레벨을 올리면 반드시 더 잘게 쪼개진다.
 * 담당 작가와 초대받은 부부가 함께 쓴다. 실패: 400(미지원 레벨) · 403 · 404.
 */
export function getPhotoClusters(
  galleryId: number,
  level?: number,
): Promise<PhotoClustersResponse> {
  const query = level !== undefined ? `?level=${level}` : "";
  return api(`/api/v1/galleries/${galleryId}/photo-clusters${query}`);
}

export type FolderRequest = {
  name: string;
  photoIds: number[];
};

export type PhotoFolderResponse = {
  folderId: number;
  /** 이 폴더가 속한 앨범(부모폴더) id */
  groupId: number;
  name: string;
  /** 삭제된 사진은 세지 않는다 */
  photoCount: number;
  /** 대표 사진 — 빈 폴더면 null */
  coverPhoto: PhotoResponse | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PhotoFolderGroupResponse = {
  groupId: number;
  name: string;
  /** 자식폴더 요약 — 만든 순서대로 */
  folders: PhotoFolderResponse[];
  createdAt: string | null;
  updatedAt: string | null;
};

/**
 * 앨범(부모폴더) 생성 — 클러스터 묶음을 folders로 실어 한 번에 고정한다.
 * 같은 앨범 안 폴더끼리 사진이 겹치면 전체가 409로 거절된다(400: 상한·이름).
 * 부부는 갤러리가 열려 있고 기한 안일 때만 가능하고, 작가는 제약이 없다.
 */
export function createFolderGroup(
  galleryId: number,
  body: { name: string; folders: FolderRequest[] },
): Promise<PhotoFolderGroupResponse> {
  return api(`/api/v1/galleries/${galleryId}/folder-groups`, {
    method: "POST",
    body,
  });
}

/** 앨범 목록 — 좌측 앨범 메뉴가 이 응답 하나로 그려진다. 최근 앨범 먼저, 폴더는 만든 순. */
export function listFolderGroups(
  galleryId: number,
): Promise<PhotoFolderGroupResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/folder-groups`);
}

export type PhotoFolderDetailResponse = {
  folderId: number;
  groupId: number;
  name: string;
  /** 폴더에 든 사진 전부 — 갤러리 노출 순서. 담은 뒤 삭제된 사진은 빠진다. */
  photos: PhotoResponse[];
  /** 서명 URL 남은 수명(초) — 지나기 전 다시 부르면 새 URL */
  viewUrlTtlSeconds: number;
  createdAt: string | null;
  updatedAt: string | null;
};

/** 폴더 열람 — 든 사진 전부를 서명 URL과 함께 */
export function getFolderDetail(
  galleryId: number,
  groupId: number,
  folderId: number,
): Promise<PhotoFolderDetailResponse> {
  return api(
    `/api/v1/galleries/${galleryId}/folder-groups/${groupId}/folders/${folderId}`,
  );
}

/** 앨범(부모폴더) 이름 변경 */
export function renameFolderGroup(
  galleryId: number,
  groupId: number,
  name: string,
): Promise<PhotoFolderGroupResponse> {
  return api(`/api/v1/galleries/${galleryId}/folder-groups/${groupId}`, {
    method: "PATCH",
    body: { name },
  });
}

/** 폴더(자식) 이름 변경 */
export function renameFolder(
  galleryId: number,
  groupId: number,
  folderId: number,
  name: string,
): Promise<PhotoFolderResponse> {
  return api(
    `/api/v1/galleries/${galleryId}/folder-groups/${groupId}/folders/${folderId}`,
    { method: "PATCH", body: { name } },
  );
}

/** 앨범 삭제 — 안의 폴더·항목까지 함께. 사진 원본은 갤러리에 남는다. */
export function deleteFolderGroup(
  galleryId: number,
  groupId: number,
): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/folder-groups/${groupId}`, {
    method: "DELETE",
  });
}

/** 폴더 삭제 — 담긴 목록만 지워지고 사진 원본은 갤러리에 남는다. */
export function deleteFolder(
  galleryId: number,
  groupId: number,
  folderId: number,
): Promise<void> {
  return api(
    `/api/v1/galleries/${galleryId}/folder-groups/${groupId}/folders/${folderId}`,
    { method: "DELETE" },
  );
}

/**
 * 폴더에 사진 담기 — 같은 앨범 안 다른 폴더에 이미 든 사진이 섞이면
 * 전체가 409로 거절된다(그때는 이동 API를 쓴다).
 */
export function addPhotosToFolder(
  galleryId: number,
  groupId: number,
  folderId: number,
  photoIds: number[],
): Promise<PhotoFolderDetailResponse> {
  return api(
    `/api/v1/galleries/${galleryId}/folder-groups/${groupId}/folders/${folderId}/photos`,
    { method: "POST", body: { photoIds } },
  );
}

/**
 * 사진을 같은 앨범의 다른 폴더로 이동 — 드래그 앤 드롭이 부르는 API.
 * 옮길 사진 전부가 출발지 폴더에 들어 있어야 하고, 도착지는 같은 앨범
 * 아래여야 한다. 응답은 사진이 도착한 폴더의 상세.
 */
export function movePhotosToFolder(
  galleryId: number,
  groupId: number,
  folderId: number,
  body: { targetFolderId: number; photoIds: number[] },
): Promise<PhotoFolderDetailResponse> {
  return api(
    `/api/v1/galleries/${galleryId}/folder-groups/${groupId}/folders/${folderId}/photos/move`,
    { method: "POST", body },
  );
}

/** 폴더에서 사진 빼기 — 폴더에서만 빠지고 사진 원본은 갤러리에 남는다. */
export function removePhotoFromFolder(
  galleryId: number,
  groupId: number,
  folderId: number,
  photoId: number,
): Promise<void> {
  return api(
    `/api/v1/galleries/${galleryId}/folder-groups/${groupId}/folders/${folderId}/photos/${photoId}`,
    { method: "DELETE" },
  );
}

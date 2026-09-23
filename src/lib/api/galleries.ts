/**
 * 갤러리 API — 스웨거 [Gallery]·[Selection] 계약의 타입화
 * 위치: src/lib/api/galleries.ts
 */

import { api } from "@/lib/api/client";

/** 갤러리 화면의 6단계 진행 상태 — 홈 카드 칩·필터가 이 값으로 갈린다 */
export type GalleryStage =
  | "UPLOAD"
  | "SELECTION_IN_PROGRESS"
  | "SELECTION_COMPLETED"
  | "RETOUCH"
  | "DELIVERY"
  | "ARCHIVED";

/** 촬영 종류. AI 폴더의 큰 분류 목록이 이 값으로 갈린다 */
export type ShootType = "REHEARSAL" | "CEREMONY" | "OTHER";

export type GalleryResponse = {
  id: number;
  /** 소속 작업공간(스튜디오 또는 개인) id — 스튜디오 홈 링크(번호로도 열림)와 홈 필터에 쓴다 */
  workspaceId: number;
  studioId: number;
  title: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  workflowStatus: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  stage: GalleryStage;
  shootType: ShootType;
  /** 사진 선택 마감 기한. null이면 기한 없이 열려 있다. */
  selectionDeadline: string | null;
  /** 클라이언트가 최종적으로 고를 사진 장수. null이면 제한이 없다. */
  maxSelectablePhotoCount: number | null;
  /** 계약한 보정 요청 횟수. null이면 제한이 없다. */
  maxRetouchRoundCount: number | null;
  createdAt: string | null;
  /** 클라이언트가 폴더 확정(from-clusters)을 해야 고를 수 있는 갤러리인지. 새 갤러리는 true */
  photoOrganizationRequired: boolean;
  /** 클라이언트가 폴더를 확정한 시각. null이면 아직 — 확정 전엔 클라이언트가 고를 수 없다 */
  foldersSavedAt: string | null;
  retouchConfirmedAt: string | null;
  archivedUntil: string | null;
  /** 플랜 기간 끝. 지나면 업로드 · 편집이 403(GALLERY_403_6) */
  planExpiresAt: string | null;
  /** 플랜의 사진 상한. 발급 때 "지금 사진 + 올릴 사진"이 넘으면 409(GALLERY_409_3). null이면 제한 없음 */
  planMaxPhotoCount: number | null;
};

export type CreateGalleryRequest = {
  title: string;
  /** 갤러리를 소유할 스튜디오 작업공간 id. 스튜디오가 여럿일 때 어느 홈의 갤러리인지 못 박는다 */
  workspaceId?: number;
  selectionDeadline?: string | null;
  maxSelectablePhotoCount?: number | null;
  maxRetouchRoundCount?: number | null;
  /** 비우면 서버가 리허설로 저장한다 — 화면은 개인 온보딩과 같이 본식을 기본으로 보낸다 */
  shootType?: ShootType;
};

export type CreatePersonalGalleryRequest = CreateGalleryRequest & {
  /** 테스트 결제로 받은 이용권. 한 번 쓰면 소진된다 */
  checkoutId: string;
  /** AI 폴더의 큰 분류를 가르는 값. 온보딩은 본식으로 보내고 갤러리 설정에서 바꾼다 */
  shootType: "REHEARSAL" | "CEREMONY" | "OTHER";
};

/**
 * 개인 갤러리 개설 — 본인 이용권(checkoutId)을 한 번 쓴다. 만들어진 갤러리는 즉시
 * 공개 상태이고, 플랜 기간이 기본 완료 예정일이 된다. 만든 사람이 OWNER다.
 */
export function createPersonalGallery(
  request: CreatePersonalGalleryRequest,
): Promise<GalleryResponse> {
  return api("/api/v1/galleries/personal", { method: "POST", body: request });
}

/**
 * 폼의 날짜(YYYY-MM-DD)를 그날이 다 가기 전까지의 마감 일시(KST)로 바꾼다.
 * 생성·재오픈 등 selectionDeadline을 받는 모든 요청이 같은 규칙을 쓴다.
 */
export function toSelectionDeadline(date: string): string {
  return `${date}T23:59:59+09:00`;
}

/**
 * 내 갤러리 목록. 작가는 스튜디오의 갤러리 전부를 받는다.
 * 필터·페이징 없이 전체가 오고, 열람·선택 수치는 포함되지 않는다.
 */
export function listGalleries(): Promise<GalleryResponse[]> {
  return api("/api/v1/galleries");
}

/**
 * 갤러리 생성. 만들어진 갤러리는 DRAFT라 열기 전까지 부부에게 보이지 않는다.
 *
 * 실패 코드: 400(이미 지난 마감 기한) · STUDIO_404_1(스튜디오 없음 — 온보딩 미완료).
 */
export function createGallery(
  request: CreateGalleryRequest,
): Promise<GalleryResponse> {
  return api("/api/v1/galleries", { method: "POST", body: request });
}

/**
 * 갤러리 단건 조회. 담당 작가이거나 초대를 수락한 멤버여야 한다.
 *
 * 실패 코드: 403(권한 없음·멤버가 DRAFT 조회) · 404(없는 갤러리).
 */
export function getGallery(galleryId: number): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}`);
}

/**
 * 갤러리 열기 — DRAFT→OPEN. 열어야 초대된 부부에게 보인다.
 * 담당 작가만(403). DRAFT가 아니면 400.
 */
export function openGallery(galleryId: number): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/open`, { method: "POST" });
}

/**
 * 갤러리 선택 마감 — OPEN→CLOSED. 부부는 계속 볼 수 있고 고르는 것만
 * 막힌다. 담당 작가만(403). OPEN이 아니면 400.
 */
export function closeGallery(galleryId: number): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/close`, { method: "POST" });
}

/**
 * 갤러리 재오픈 — CLOSED→OPEN. 지난 기한을 그대로 두면 열자마자 다시
 * 막히므로 마감 기한을 다시 받는다(null이면 기한 없음). 담당 작가만(403).
 * CLOSED가 아니거나 지난 기한이면 400.
 */
export function reopenGallery(
  galleryId: number,
  selectionDeadline: string | null,
): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/reopen`, {
    method: "POST",
    body: { selectionDeadline },
  });
}

/**
 * 갤러리 휴지통 이동 — 즉시 삭제가 아니다. 휴지통에서 복원할 수 있고,
 * 보관 기간이 지나면 원본과 함께 자동으로 물리 삭제된다. 담당 작가만(403).
 */
export function moveGalleryToTrash(galleryId: number): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}`, { method: "DELETE" });
}

/**
 * 휴지통 갤러리 즉시 완전 삭제 — 보관 기간을 기다리지 않고 지금 물리 삭제한다.
 * 사진 원본·미리보기와 폴더·앨범·협업 기록까지 사라지며 복구할 수 없다.
 * 홈의 "완전히 삭제"는 휴지통 이동 → 이 호출을 이어서 부른다 (휴지통 UI를 두지 않기로 한 결정).
 */
export function purgeGallery(galleryId: number): Promise<void> {
  return api(`/api/v1/trash/galleries/${galleryId}`, { method: "DELETE" });
}

/**
 * 갤러리 이름 변경. 상태와 무관한 표시 정보라 DRAFT·OPEN·CLOSED 어느
 * 상태에서든 바꿀 수 있다. 담당 작가만(403).
 */
export function renameGallery(
  galleryId: number,
  title: string,
): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/title`, {
    method: "PATCH",
    body: { title },
  });
}

/**
 * 선택 마감 기한 변경. null이면 기한이 없어진다. 상태는 건드리지 않는다 —
 * CLOSED 갤러리의 기한을 바꿔도 그것만으로 다시 열리지는 않는다(재오픈의 일).
 * 담당 작가만(403).
 */
export function changeSelectionDeadline(
  galleryId: number,
  selectionDeadline: string | null,
): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/selection-deadline`, {
    method: "PATCH",
    body: { selectionDeadline },
  });
}

/**
 * 계약 장수 변경. null을 보내면 제한이 없어지고, 이미 고른 장수보다
 * 작은 값도 받는다(계약 축소는 실제로 있는 일). 담당 작가만(403).
 */
export function patchMaxSelectablePhotoCount(
  galleryId: number,
  maxSelectablePhotoCount: number | null,
): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/max-selectable-photo-count`, {
    method: "PATCH",
    body: { maxSelectablePhotoCount },
  });
}

export type GalleryMemberResponse = {
  /** 내보낼 때 쓰는 id — 사용자 id가 아니다. */
  memberId: number;
  userId: number;
  nickname: string;
  email: string | null;
  /** 초대를 수락한 시각. */
  joinedAt: string | null;
};

/**
 * 갤러리 멤버 목록. 담당 작가와 부부 모두 조회 가능, 정원 2명이라
 * 최대 두 건. 마감 뒤에도 열린다. 개인 갤러리면 워크스페이스 멤버(소유자 + 파트너)가 이 모양으로 온다.
 */
export function listGalleryMembers(
  galleryId: number,
): Promise<GalleryMemberResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/members`);
}

/** 멤버 내보내기 — 담당 작가(개인 갤러리는 소유자)만. 내보낸 사람에게 알림이 간다 */
export function removeGalleryMember(galleryId: number, memberId: number): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/members/${memberId}`, { method: "DELETE" });
}

/**
 * 개인 갤러리 설정 저장 — 소유자만, 보관 뒤엔 불가. 선택 마감은 플랜 만료(planExpiresAt) 전까지만.
 * 고를 장수 null = 몇 장이든(내보내기 때 정확히 채울 필요 없음).
 */
export function updatePersonalGallery(
  galleryId: number,
  body: { title: string; selectionDeadline: string | null; maxSelectablePhotoCount: number | null },
): Promise<GalleryResponse> {
  return api(`/api/v1/galleries/${galleryId}/personal`, { method: "PATCH", body });
}

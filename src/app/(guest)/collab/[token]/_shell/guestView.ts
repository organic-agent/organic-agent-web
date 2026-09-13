/**
 * 게스트 화면 파생값 — 제목 · 남은 기간 · 정렬
 * 위치: src/app/(guest)/collab/[token]/_shell/guestView.ts
 */

import type { CollabPhotoResponse } from "@/lib/api/collab";
import type { CollabLandingResponse } from "@/lib/api/collabGuest";

/**
 * 크게 보여 줄 제목 — 부부가 표지 제목을 정했으면 그것, 안 정했으면 서버가 세션 이름을 넣어 주므로
 * (이 링크의 앨범 이름과 같으면) 갤러리 이름으로 돌아간다.
 */
export function displayTitleOf(landing: CollabLandingResponse, token: string): string {
  const own = landing.albums.find((a) => a.collabToken === token);
  const cover = landing.coverTitle?.trim();
  if (!cover || (own && cover === own.name.trim())) return landing.galleryTitle;
  return cover;
}

/** "n일 남음" · "오늘 만료" — 없으면 null */
export function daysLeftLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days) || days < 0) return null;
  return days === 0 ? "오늘 만료" : `${days}일 남음`;
}

const timeOf = (p: CollabPhotoResponse) => (p.photo.createdAt ? new Date(p.photo.createdAt).getTime() : 0);
/** 최신순(기본) · 오래된순 — 시간이 없으면 displayOrder */
export function sortGuestPhotos(list: CollabPhotoResponse[], newestFirst: boolean): CollabPhotoResponse[] {
  const sign = newestFirst ? -1 : 1;
  return [...list].sort((a, b) => sign * (timeOf(a) - timeOf(b) || a.photo.displayOrder - b.photo.displayOrder));
}

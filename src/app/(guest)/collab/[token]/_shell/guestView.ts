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

/** "방금" · "n분 전" · "n시간 전" · "n일 전" · "M.DD" */
export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(t);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}

const timeOf = (p: CollabPhotoResponse) => (p.photo.createdAt ? new Date(p.photo.createdAt).getTime() : 0);
/** 최신순(기본) · 오래된순 — 시간이 없으면 displayOrder */
export function sortGuestPhotos(list: CollabPhotoResponse[], newestFirst: boolean): CollabPhotoResponse[] {
  const sign = newestFirst ? -1 : 1;
  return [...list].sort((a, b) => sign * (timeOf(a) - timeOf(b) || a.photo.displayOrder - b.photo.displayOrder));
}

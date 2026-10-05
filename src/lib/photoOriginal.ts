/**
 * 확대할 때 쓸 원본 주소 — 받아서 유효 시간 동안 기억한다
 * 위치: src/lib/photoOriginal.ts
 *
 * 크게 보기는 미리보기(viewUrl)를 그린다. 확대하는 순간 사진 한 장 조회로 원본 주소(1시간 유효)를 받아 큰 사진으로
 * 바꿔 끼운다. 같은 사진을 다시 확대할 때 다시 묻지 않게 만료 조금 전까지 기억한다(새로 고치면 사라진다).
 * 원본을 쓸 수 없으면 null을 준다 — 미리보기가 곧 원본이거나(previewReady가 false), 브라우저가 그리지 못하는
 * 형식(HEIC 등)이거나, 아직 올라오지 않은 사진이다. 그때는 미리보기를 그대로 확대한다.
 */

import { getPhoto, type PhotoResponse } from "@/lib/api/photos";

/** 브라우저가 img로 그릴 수 있는 원본 형식 */
const DRAWABLE = new Set(["image/jpeg", "image/png", "image/webp"]);
/** 만료 이만큼 전부터는 새로 받는다 */
const MARGIN_MS = 60_000;

const cache = new Map<string, { url: string; until: number }>();

export async function loadOriginalUrl(galleryId: number, photo: PhotoResponse): Promise<string | null> {
  if (!photo.previewReady || !DRAWABLE.has(photo.contentType.toLowerCase())) return null;
  const key = `${galleryId}:${photo.photoId}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.url;
  const detail = await getPhoto(galleryId, photo.photoId);
  if (!detail.originalUrl) return null;
  cache.set(key, { url: detail.originalUrl, until: Date.now() + detail.originalUrlTtlSeconds * 1000 - MARGIN_MS });
  return detail.originalUrl;
}

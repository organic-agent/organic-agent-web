/**
 * 부부 — 사진 목업 데이터
 * 위치: src/lib/couple/photos.ts
 *
 * 부부 화면에서 쓰는 사진 목록과 사진 URL 유틸을 관리한다.
 */

export type Photo = {
  id: number;
  photoId: string;
  scene: string;
  person: string;
};

export const SCENE_FILTERS = ["전체", "야외", "실내", "검은배경", "우드배경"];
export const PERSON_FILTERS = ["전체", "신랑", "신부", "신랑신부", "기타"];

export const SCENES = ["야외", "실내", "검은배경", "우드배경"];
export const PERSONS = ["신랑", "신부", "신랑신부", "기타"];

const PHOTO_ID_POOL = [
  "1519741497674-611481863552",
  "1606216794074-735e91aa2c92",
  "1583939003579-730e3918a45a",
  "1591604466107-ec97de577aff",
  "1519225421980-715cb0215aed",
  "1465495976277-4387d4b0b4c6",
  "1511285560929-80b456fea0bc",
  "1537633552985-df8429e8048b",
  "1460978812857-470ed1c77af0",
  "1522673607200-164d1b6ce486",
  "1594744803329-e58b31de8bf5",
];

function buildPhotos(): Photo[] {
  const photos: Photo[] = [];
  let id = 1;
  for (const [si, scene] of SCENES.entries()) {
    for (const [pi, person] of PERSONS.entries()) {
      const count = 2 + ((si + pi) % 3);
      for (let i = 0; i < count; i++) {
        photos.push({
          id,
          photoId: PHOTO_ID_POOL[(id - 1) % PHOTO_ID_POOL.length],
          scene,
          person,
        });
        id++;
      }
    }
  }
  return photos;
}

export const PHOTOS: Photo[] = buildPhotos();

export function photoUrl(photoId: string, w = 500) {
  return `https://images.unsplash.com/photo-${photoId}?w=${w}&q=80`;
}

export function getPhotosByIds(ids: number[]): Photo[] {
  const set = new Set(ids);
  return PHOTOS.filter((photo) => set.has(photo.id));
}

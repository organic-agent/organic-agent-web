/**
 * 부부 — 사진 목업 데이터
 * 위치: src/lib/couple/photos.ts
 *
 * ⚠️ 초상권 문제로 저장소에는 실제 사진(URL 포함)을 두지 않는다.
 *    실사진 연결은 깃허브 공개 후 로컬에서만 추가할 예정 — 그 전까지 화면은
 *    회색 플레이스홀더로 표시된다. 여기는 장면·인물 메타데이터만 관리한다.
 */

export type Photo = {
  id: number;
  scene: string;
  person: string;
};

export const SCENES = ["야외", "실내", "검은배경", "우드배경"];
export const PERSONS = ["신랑", "신부", "신랑신부", "기타"];

function buildPhotos(): Photo[] {
  const photos: Photo[] = [];
  let id = 1;
  for (const [si, scene] of SCENES.entries()) {
    for (const [pi, person] of PERSONS.entries()) {
      const count = 2 + ((si + pi) % 3);
      for (let i = 0; i < count; i++) {
        photos.push({ id, scene, person });
        id++;
      }
    }
  }
  return photos;
}

export const PHOTOS: Photo[] = buildPhotos();

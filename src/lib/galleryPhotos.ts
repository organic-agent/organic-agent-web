/**
 * 갤러리 사진/셀렉 목업 데이터 어댑터
 * 위치: src/lib/galleryPhotos.ts
 *
 * 작가와 부부 화면이 함께 쓰는 사진, 폴더, 선택 상태 목업 API를 중립 이름으로 노출한다.
 * 현재 구현은 부부 목업 저장소를 재사용하지만, 백엔드 연동 시 이 파일을 실제 갤러리 사진 API로 교체한다.
 */

export {
  SELECT_TARGET,
  PERSON_FILTERS,
  SCENE_FILTERS,
  getGalleryFolders,
  photoUrl,
  useCompareTags,
  useSelectedIds,
  type CompareTag,
} from "@/lib/couple";

/**
 * 작가 — 갤러리 생성 토스트
 * 위치: src/app/(photographer)/galleries/_components/GalleryCreatedToast.tsx
 *
 * 새 갤러리 생성 후 목록 화면 하단에 짧은 완료 알림을 보여준다.
 * 액션 버튼 없이 생성된 갤러리 이름만 함께 표시한다.
 */

type Props = {
  galleryName: string | null;
};

export function GalleryCreatedToast({ galleryName }: Props) {
  if (!galleryName) return null;

  return (
    <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-(--pill) bg-bg-neutral-inverted px-5 py-3 type-label-button text-fg-neutral-inverted shadow-(--shadow-hover)">
      갤러리가 생성됐어요 · {galleryName}
    </div>
  );
}

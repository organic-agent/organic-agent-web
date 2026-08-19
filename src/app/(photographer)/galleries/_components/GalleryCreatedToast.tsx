/**
 * 작가 — 갤러리 생성 토스트 (피그마 Toast/GalleryCreated 대응)
 * 위치: src/app/(photographer)/galleries/_components/GalleryCreatedToast.tsx
 *
 * 새 갤러리 생성 후 목록 화면 하단에 짧은 완료 알림을 보여준다.
 * 둘째 줄이 생성 직후 상태(DRAFT — 열기 전까지 부부에게 비공개)를 안내한다.
 */

type Props = {
  galleryName: string | null;
};

export function GalleryCreatedToast({ galleryName }: Props) {
  if (!galleryName) return null;

  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-0.5 rounded-(--radius-8) bg-bg-neutral-inverted px-5 py-3 shadow-(--shadow-hover)">
      <p className="type-label-button text-fg-neutral-inverted">
        ‘{galleryName}’ 갤러리를 만들었어요
      </p>
      <p className="type-body-small text-fg-neutral-inverted-muted">
        열기 전까지 부부에게 보이지 않아요 · 준비되면 카드에서 열어주세요
      </p>
    </div>
  );
}

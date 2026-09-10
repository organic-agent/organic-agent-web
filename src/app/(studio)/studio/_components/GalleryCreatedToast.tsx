/**
 * 작가 — 갤러리 생성 토스트 (피그마 Toast/GalleryCreated 대응)
 * 위치: src/app/(studio)/studio/_components/GalleryCreatedToast.tsx
 *
 * 새 갤러리 생성 후 목록 화면 하단에 짧은 완료 알림을 보여준다.
 * 둘째 줄이 다음 할 일(사진 업로드 · 클라이언트 초대)을 안내한다.
 */

type Props = {
  galleryName: string | null;
};

export function GalleryCreatedToast({ galleryName }: Props) {
  if (!galleryName) return null;

  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-0.5 rounded-(--radius-8) bg-background-inverse-main px-5 py-3 shadow-(--shadow-hover)">
      <p className="type-label-medium-m text-contents-dark-bgd-default">
        ‘{galleryName}’ 갤러리를 만들었어요
      </p>
      <p className="type-content-xs text-contents-dark-bgd-weakness">
        사진을 올리고 클라이언트를 초대해 보세요
      </p>
    </div>
  );
}

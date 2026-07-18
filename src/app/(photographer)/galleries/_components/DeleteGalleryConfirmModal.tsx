/**
 * 작가 — 갤러리 삭제 확인 모달
 * 위치: src/app/(photographer)/galleries/_components/DeleteGalleryConfirmModal.tsx
 *
 * 목록 카드 메뉴에서 삭제를 누른 뒤 최종 확인을 받는다.
 * 실수 삭제를 막기 위해 갤러리 이름과 되돌릴 수 없다는 안내를 보여준다.
 *
 * 주요 책임:
 * - 삭제 대상 안내
 * - 삭제 취소/확정 이벤트 전달
 */

import type { Gallery } from "@/lib/galleries";
import { GalleryModalButtons, GalleryModalShell } from "./GalleryModalShell";

type Props = {
  gallery: Gallery | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteGalleryConfirmModal({
  gallery,
  onClose,
  onConfirm,
}: Props) {
  if (!gallery) return null;

  return (
    <GalleryModalShell
      title="갤러리를 삭제할까요?"
      maxWidthClassName="max-w-[380px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      <p className="text-[13px] text-ink-2 leading-relaxed mb-6">
        <span className="font-medium text-ink">{gallery.couple}</span>{" "}
        갤러리가 목록에서 삭제됩니다. 이 작업은 되돌릴 수 없어요.
      </p>
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={onConfirm}
        confirmLabel="삭제"
        confirmVariant="danger"
      />
    </GalleryModalShell>
  );
}

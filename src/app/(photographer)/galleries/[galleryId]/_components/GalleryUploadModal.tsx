/**
 * 작가 — 사진 업로드 모달 (피그마 Modal/Upload 대응)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryUploadModal.tsx
 *
 * 워크스페이스 사이드바의 "사진 업로드"에서 여는 업로드 흐름 시연 모달.
 * 실제 파일 저장·전송은 아직 연결되어 있지 않다 — 확인 액션만 부모로 전달한다.
 */

import { UploadIcon } from "@/components/icons";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "../../_components/GalleryModalShell";

type Props = {
  onClose: () => void;
  onConfirm: () => void;
};

export function GalleryUploadModal({ onClose, onConfirm }: Props) {
  return (
    <GalleryModalShell
      title="사진 업로드"
      desc="이미지 파일을 끌어다 놓으세요."
      onClose={onClose}
    >
      <div className="mb-6 grid place-items-center rounded-(--radius-16) border-2 border-dashed border-stroke-neutral-weak py-12 text-center">
        <UploadIcon size={32} className="mb-3 text-fg-neutral-subtle" />
        <p className="type-body-medium text-fg-neutral-muted">
          사진을 끌어다 놓거나 클릭해서 선택하세요
        </p>
        <p className="mt-1 type-body-small text-fg-neutral-muted">
          여러 장을 한 번에 올릴 수 있어요
        </p>
      </div>
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={onConfirm}
        confirmLabel="업로드 시작"
      />
    </GalleryModalShell>
  );
}

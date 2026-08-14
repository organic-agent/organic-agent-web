/**
 * 작가 — 갤러리 업로드 모달
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryUploadModal.tsx
 *
 * 갤러리 상세 화면에서 사진 업로드 흐름을 시연하는 모달이다.
 * 실제 업로드 대신 확인 액션을 부모 컴포넌트로 전달한다.
 *
 * 주요 책임:
 * - 업로드 안내 UI 렌더링
 * - 취소/확인 버튼 표시
 * - 업로드 확인 이벤트 전달
 *
 * 참고:
 * - 실제 파일 저장과 전송은 아직 연결되어 있지 않다.
 */

import { ModalButtons, ModalShell } from "./ModalShell";

type Props = {
  onClose: () => void;
  onConfirm: () => void;
};

export function GalleryUploadModal({ onClose, onConfirm }: Props) {
  return (
    <ModalShell
      onClose={onClose}
      title="사진 업로드"
      desc="이미지 파일을 끌어다 놓으세요."
    >
      <div className="border-2 border-dashed border-line-strong rounded-lg py-12 grid place-items-center text-center mb-6">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8a8a8a"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-3"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <p className="text-[13px] text-ink-2">여기로 파일을 끌어다 놓기</p>
        <p className="text-[11px] text-ink-3 mt-1">
          또는 클릭해서 여러 장의 이미지를 선택
        </p>
      </div>
      <ModalButtons
        onClose={onClose}
        onConfirm={onConfirm}
        confirmLabel="업로드 시작"
      />
    </ModalShell>
  );
}

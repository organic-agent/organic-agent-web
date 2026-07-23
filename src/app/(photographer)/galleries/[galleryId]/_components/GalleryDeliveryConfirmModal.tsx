import type { PhotoWorkflowSummary } from "@/lib/photographerPhotoWorkflow";
import { ModalButtons, ModalShell } from "./ModalShell";

type Props = {
  summary: PhotoWorkflowSummary;
  onClose: () => void;
  onConfirm: () => void;
  onReviewIncomplete: () => void;
};

export function GalleryDeliveryConfirmModal({
  summary,
  onClose,
  onConfirm,
  onReviewIncomplete,
}: Props) {
  const canComplete = summary.total > 0 && summary.incomplete === 0;

  return (
    <ModalShell
      onClose={onClose}
      title={canComplete ? "전달 완료로 표시할까요?" : "미완료 작업이 있어요"}
      desc={
        canComplete
          ? "완료하면 갤러리 목록과 상세의 상태가 전달 완료로 변경됩니다."
          : "최종 선택본의 보정 상태를 확인한 뒤 전달을 완료해 주세요."
      }
    >
      <div className="rounded-xl border border-line bg-paper px-4 py-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[12px] text-ink-3">최종 선택본</span>
          <strong className="text-[14px] text-ink">{summary.total}장</strong>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4">
          <span className="text-[12px] text-ink-3">보정 완료</span>
          <strong className="text-[14px] text-select">
            {summary.done}/{summary.total}장
          </strong>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4">
          <span className="text-[12px] text-ink-3">미완료</span>
          <strong
            className={`text-[14px] ${
              summary.incomplete > 0 ? "text-hold" : "text-ink"
            }`}
          >
            {summary.incomplete}장
          </strong>
        </div>
      </div>

      {canComplete ? (
        <ModalButtons
          onClose={onClose}
          onConfirm={onConfirm}
          confirmLabel="전달 완료 처리"
        />
      ) : (
        <ModalButtons
          onClose={onClose}
          onConfirm={onReviewIncomplete}
          confirmLabel={summary.total === 0 ? "최종 선택본 확인" : "미완료 사진 확인"}
        />
      )}
    </ModalShell>
  );
}

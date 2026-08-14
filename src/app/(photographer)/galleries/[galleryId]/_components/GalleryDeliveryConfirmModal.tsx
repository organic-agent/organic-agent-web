/**
 * 작가 — 전달 완료 확인 모달
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryDeliveryConfirmModal.tsx
 *
 * 워크스페이스 탑바의 "전달 완료로 표시"에서 열어 최종 확인을 받는다.
 * 확인하면 갤러리 상태가 전달 완료로 바뀐다 (홈 카드·필터에 반영).
 */

import {
  GalleryModalButtons,
  GalleryModalShell,
} from "../../_components/GalleryModalShell";

type Props = {
  /** 부부가 선택한 사진 수 */
  selectedCount: number;
  /** 목표 선택 장수 */
  target: number;
  /** 보정 요청이 남아 있는 사진 수 */
  retouchCount: number;
  /** 부부가 "작가에게 전달"을 눌러 셀렉을 제출했는지 */
  selectionSubmitted: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="type-body-small text-fg-neutral-muted">{label}</span>
      <strong className="type-label-button text-fg-neutral">{value}</strong>
    </div>
  );
}

export function GalleryDeliveryConfirmModal({
  selectedCount,
  target,
  retouchCount,
  selectionSubmitted,
  onClose,
  onConfirm,
}: Props) {
  return (
    <GalleryModalShell
      title="전달 완료로 표시할까요?"
      desc="완료하면 갤러리 목록과 워크스페이스의 상태가 전달 완료로 변경됩니다."
      onClose={onClose}
    >
      <div className="mb-6 flex flex-col gap-2 rounded-(--radius-8) border border-stroke-neutral-muted px-4 py-4">
        <StatRow label="부부 선택" value={`${selectedCount} / ${target}장`} />
        <StatRow label="보정 요청" value={`${retouchCount}건`} />
        {!selectionSubmitted && (
          <p className="mt-1 border-t border-stroke-neutral-muted pt-2 type-body-small text-fg-warning">
            아직 부부의 셀렉이 제출되지 않았어요. 지금 완료 처리하면 셀렉
            진행이 끝난 것으로 표시됩니다.
          </p>
        )}
      </div>
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={onConfirm}
        confirmLabel="전달 완료 처리"
      />
    </GalleryModalShell>
  );
}

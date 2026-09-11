"use client";

/**
 * 단계 전환 확인 — "보정 작업을 시작할까요?" / "n장으로 확인할까요?"
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/StageConfirmModal.tsx
 *
 * 서버의 셀렉 완료 → 보정 작업 전환 방법이 확인되기 전까지 확정은 호출부가 "준비 중"으로 답한다.
 */

import {
  GalleryModalButtons,
  GalleryModalShell,
} from "@/app/(studio)/studio/_components/GalleryModalShell";

export function StageConfirmModal({
  kind,
  selectedCount,
  maxCount,
  retouchCount,
  onClose,
  onConfirm,
}: {
  /** retouch = 제출된 선택 확인, asis = 미제출 그대로 확정 */
  kind: "retouch" | "asis";
  selectedCount: number;
  maxCount: number | null;
  retouchCount: number | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const strong = "font-medium text-contents-light-bgd-default";
  return (
    <GalleryModalShell
      title={kind === "retouch" ? "보정 작업을 시작할까요?" : `${selectedCount}장으로 확인할까요?`}
      maxWidthClassName="max-w-[440px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      <p className="mb-6 type-content-m text-contents-light-bgd-sub">
        {kind === "retouch" ? (
          <>
            클라이언트가 제출한 <span className={strong}>{selectedCount}장</span>
            {retouchCount !== null && (
              <>
                과 보정 요청 <span className={strong}>{retouchCount}건</span>
              </>
            )}
            을 확인했다는 뜻이에요. 시작하면 단계가 <span className={strong}>보정 작업</span>으로
            넘어가고, 클라이언트는 더 고칠 수 없어요. 다시 열려면 기간 연장을 써요.
          </>
        ) : (
          <>
            클라이언트가 제출하지 않은{" "}
            <span className={strong}>
              {selectedCount}
              {maxCount !== null ? ` / ${maxCount}` : ""}장
            </span>
            을 그대로 최종 선택으로 정해요. 보정 요청은 없는 상태로{" "}
            <span className={strong}>보정 작업</span> 단계가 시작돼요. 더 고르게 하려면 대신 기간
            연장을 눌러 주세요.
          </>
        )}
      </p>
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={onConfirm}
        confirmLabel={kind === "retouch" ? "보정 작업 시작" : "이대로 확인"}
      />
    </GalleryModalShell>
  );
}

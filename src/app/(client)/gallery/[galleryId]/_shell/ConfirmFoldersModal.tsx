"use client";

/**
 * 폴더 확정 모달 — 컨셉 분류 → 사진 셀렉 (POST /galleries/{id}/folders/from-clusters, 1회)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ConfirmFoldersModal.tsx
 *
 * 확정하면 사진 셀렉이 열리고 갤러리는 SELECTION_IN_PROGRESS. 확정은 되돌릴 수 없고 두 번째 호출은
 * 409(GALLERY_409_2)라 문구에 명시한다. 미분류 사진도 그대로 고를 수 있다.
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import { confirmFolders, type ConceptFolderResponse } from "@/lib/api/conceptFolders";

export function ConfirmFoldersModal({
  galleryId,
  folders,
  photoCount,
  unsortedCount,
  reviewCount,
  onClose,
  onConfirmed,
}: {
  galleryId: number;
  folders: ConceptFolderResponse[];
  photoCount: number;
  unsortedCount: number;
  reviewCount: number;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailCount = folders.reduce((n, c) => n + c.details.length, 0);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await confirmFolders(galleryId);
      onConfirmed();
    } catch (err) {
      if (err instanceof ApiError && err.code === "GALLERY_409_2") {
        // 이미 확정됨 — 화면이 낡았을 뿐이니 그대로 넘어간다
        onConfirmed();
        return;
      }
      setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <GalleryModalShell
      title="폴더를 확정할까요?"
      desc="확정하면 사진 셀렉이 열려 사진을 고를 수 있어요. 폴더는 확정 뒤에 바꿀 수 없어요 — 옮길 사진이 남아 있으면 먼저 정리해 주세요."
      maxWidthClassName="max-w-120"
      onClose={onClose}
    >
      <dl className="mb-5 flex flex-col type-content-s">
        <Row label="컨셉 폴더" value={`${folders.length}개 · 세부 폴더 ${detailCount}개`} />
        <Row
          label="사진"
          value={`${photoCount}장${unsortedCount > 0 ? ` · 미분류 ${unsortedCount}장은 그대로 고를 수 있어요` : ""}`}
        />
        {reviewCount > 0 && <Row label="검토 배지" value={`${reviewCount}개 남음 (AI가 확신이 낮은 폴더)`} />}
      </dl>
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void confirm()}
        confirmLabel={busy ? "확정하는 중…" : "폴더 확정"}
        disabled={busy}
      />
    </GalleryModalShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-divider-default py-2 last:border-b">
      <dt className="shrink-0 text-contents-light-bgd-weakness">{label}</dt>
      <dd className="text-right font-medium text-contents-light-bgd-default">{value}</dd>
    </div>
  );
}

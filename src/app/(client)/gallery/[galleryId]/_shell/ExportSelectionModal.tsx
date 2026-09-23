"use client";

/**
 * 요청서 내보내기 확인 모달(개인 갤러리) — 초안 일괄 저장 → export → 셀렉 잠김 (묶음 C, 2026-09-23 확정)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/ExportSelectionModal.tsx
 *
 * 작가가 없는 개인 갤러리는 submit 대신 export가 완료 동작이다(PERSONAL_EXPORT_REQUIRED). export는 요청 본문을
 * 받지 않으므로 브라우저 초안을 먼저 초안(DRAFTING) 회차에 담고(POST retouch/photos) 문장 · 점을 써 넣은 뒤
 * (PUT …/request) export를 부른다 — 첫 내보내기에 1회차가 REQUESTED가 되고 셀렉이 잠긴다.
 * 서버가 돌려주는 CSV는 받지 않고 흘려 보낸다. 파일은 이어지는 작가 내려받기 모달(CSV / ZIP · 범위)에서 받는다(Q2).
 * 이미 담긴 사진이 섞이면 409라, 진행 중 회차에 든 사진은 빼고 담는다(중간에 끊겨도 다시 눌러 이어 갈 수 있게).
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ApiError } from "@/lib/api/client";
import { addRetouchPhotos, getRetouchOverview, type RetouchRequestItem, updateRetouchPhotoRequest } from "@/lib/api/retouch";
import { downloadSelectionCsv } from "@/lib/api/selection";

export function ExportSelectionModal({
  galleryId,
  selectedCount,
  maxSelectable,
  requests,
  unpickedDraftCount,
  ratedCount,
  partnerName,
  onClose,
  onExported,
}: {
  galleryId: number;
  selectedCount: number;
  maxSelectable: number | null;
  /** 고른 사진의 보정 요청(초안 회차에 저장할 것) */
  requests: RetouchRequestItem[];
  /** 고르지 않은 사진에 남은 초안 수 — 실리지 않는다 */
  unpickedDraftCount: number;
  ratedCount: number;
  /** 함께 고르는 사람 — 있으면 알림이 간다는 한 줄 */
  partnerName?: string | null;
  onClose: () => void;
  onExported: () => void;
}) {
  const [busy, setBusy] = useState<"save" | "export" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const points = requests.reduce((n, r) => n + r.points.length, 0);
  const refined = requests.reduce((n, r) => n + r.points.filter((p) => p.useRefinedText).length, 0);

  async function run() {
    if (busy) return;
    setError(null);
    try {
      if (requests.length > 0) {
        setBusy("save");
        const overview = await getRetouchOverview(galleryId);
        const drafting = overview.currentRound?.status === "DRAFTING" ? overview.currentRound : null;
        const inDraft = new Set(drafting?.photos.map((p) => p.photo.photoId) ?? []);
        const toAdd = requests.map((r) => r.photoId).filter((id) => !inDraft.has(id));
        if (toAdd.length > 0) await addRetouchPhotos(galleryId, toAdd);
        for (const r of requests) await updateRetouchPhotoRequest(galleryId, r.photoId, { requestText: r.requestText, points: r.points });
      }
      setBusy("export");
      await downloadSelectionCsv(galleryId);
      onExported();
    } catch (err) {
      if (err instanceof ApiError && err.code === "SELECTION_400_7")
        setError(maxSelectable !== null ? `목표 장수 ${maxSelectable}장을 정확히 채워야 내보낼 수 있어요 (지금 ${selectedCount}장).` : err.message);
      else if (err instanceof ApiError && err.code === "SELECTION_400_6") setError("고른 사진이 없어요.");
      else if (err instanceof ApiError && err.status === 409) setError("이미 내보냈거나 진행 중인 보정 회차가 있어요 · 화면을 새로 고쳐 주세요.");
      else setError(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(null);
    }
  }

  return (
    <GalleryModalShell
      title="요청서를 내보낼까요?"
      desc={
        <>
          내보내면 <b className="text-contents-light-bgd-default">선택이 잠기고 보정 확인 단계로 넘어가요.</b> 요청서는 다시 받을 수 있어요.
        </>
      }
      maxWidthClassName="max-w-120"
      onClose={onClose}
    >
      <dl className="mb-5 flex flex-col type-content-s">
        <Row label="고른 사진" value={maxSelectable !== null ? `${selectedCount} / ${maxSelectable}장` : `${selectedCount}장`} />
        <Row
          label="보정 요청"
          value={requests.length === 0 ? "없음 · 고른 사진은 모두 기본 보정 대상이에요" : `${requests.length}장 · 점 ${points}개${refined > 0 ? ` (AI 다듬기 ${refined})` : ""}`}
        />
        <Row label="별점" value={ratedCount > 0 ? `${ratedCount}장 매김` : "없음"} />
      </dl>
      {unpickedDraftCount > 0 && (
        <p className="mb-4 rounded-(--radius-8) bg-function-warning-background px-3 py-2 type-content-xs text-contents-light-bgd-default">
          고르지 않은 사진 {unpickedDraftCount}장에 쓴 보정 요청은 실리지 않아요. 필요하면 먼저 그 사진을 골라 주세요.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      {partnerName && !error && <p className="mb-3 type-content-xs text-contents-light-bgd-weakness">{partnerName}에게도 알림이 가요</p>}
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void run()}
        confirmLabel={busy === "save" ? "요청 저장하는 중…" : busy === "export" ? "내보내는 중…" : "내보내기"}
        disabled={busy !== null}
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

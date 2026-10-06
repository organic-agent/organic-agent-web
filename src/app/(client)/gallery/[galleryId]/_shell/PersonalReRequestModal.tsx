"use client";

/**
 * 개인 갤러리의 다음 회차 요청서 만들기(이슈 125) — 보정 요청 탭에 적은 초안을 서버 초안 회차에 담고 요청서 내려받기로 잇는다
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/PersonalReRequestModal.tsx
 *
 * 작가가 없어 /rounds/{n}/requests(스튜디오 갤러리 전용) 대신 1차 내보내기와 같은 길을 간다 — 지난 회차가 아직 REQUESTED면
 * 보정본이 다 올라와 있을 때 회차를 끝내고(send, "끝난 회차부터 다음 회차를 시작할 수 있다"), 초안 회차에 사진을 담고
 * (POST retouch/photos — 회차가 없으면 생긴다, 이미 담긴 사진이 섞이면 409라 빼고 담는다) 문장 · 점을 써 넣는다(PUT …/request).
 * 그다음은 요청서 내려받기 모달(부모). 새 회차의 보정본 올리기는 서버가 REQUESTED 회차에만 받아 아직 막힐 수 있다(서버에 전달).
 * "요청서 내려받기"를 눌렀는데 적어 둔 다음 회차 요청이 있을 때만 뜬다 — 지난 요청서만 받는 길도 남긴다.
 */

import { useState } from "react";
import { GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import {
  addRetouchPhotos,
  getRetouchOverview,
  type RetouchRequestItem,
  type RetouchRoundSummaryResponse,
  sendRetouchRound,
  updateRetouchPhotoRequest,
} from "@/lib/api/retouch";

export function PersonalReRequestModal({
  galleryId,
  latestRound,
  allResultsIn,
  nextRoundNo,
  requests,
  points,
  onClose,
  onDownloadOnly,
  onCreated,
}: {
  galleryId: number;
  latestRound: RetouchRoundSummaryResponse;
  /** 지난 회차의 사진 전부에 보정본이 있는가 — 없으면 회차를 끝낼 수 없다 */
  allResultsIn: boolean;
  nextRoundNo: number;
  requests: RetouchRequestItem[];
  points: number;
  onClose: () => void;
  /** 다음 회차는 만들지 않고 지난 요청서만 받는다 */
  onDownloadOnly: () => void;
  onCreated: (roundNo: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (latestRound.status === "REQUESTED") {
        if (!allResultsIn) {
          setError("보정본을 모두 올린 뒤에 다음 요청서를 만들 수 있어요");
          setBusy(false);
          return;
        }
        await sendRetouchRound(galleryId, latestRound.roundNo);
      }
      const overview = await getRetouchOverview(galleryId);
      const drafting = overview.currentRound?.status === "DRAFTING" ? overview.currentRound : null;
      const inDraft = new Set(drafting?.photos.map((p) => p.photo.photoId) ?? []);
      const toAdd = requests.map((r) => r.photoId).filter((id) => !inDraft.has(id));
      if (toAdd.length > 0) await addRetouchPhotos(galleryId, toAdd);
      for (const r of requests) await updateRetouchPhotoRequest(galleryId, r.photoId, { requestText: r.requestText, points: r.points });
      const after = await getRetouchOverview(galleryId);
      onCreated(after.currentRound?.roundNo ?? nextRoundNo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "요청서를 만들지 못했어요 · 네트워크 연결을 확인한 뒤 다시 시도해 주세요");
      setBusy(false);
    }
  }

  return (
    <GalleryModalShell title={`${nextRoundNo}차 요청서를 만들까요?`} maxWidthClassName="max-w-110" onClose={onClose}>
      <dl className="mb-5 flex flex-col type-content-s">
        <Row label="다시 요청할 사진" value={`${requests.length}장`} />
        <Row label="점" value={points > 0 ? `${points}개` : "없음"} />
      </dl>
      {error && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button kind="ghost" onClick={onDownloadOnly} disabled={busy} className="flex-1">
          {latestRound.roundNo}차 요청서만 받기
        </Button>
        <Button onClick={() => void run()} disabled={busy || requests.length === 0} className="flex-1">
          {busy ? "만드는 중…" : `${nextRoundNo}차 요청서 만들기`}
        </Button>
      </div>
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

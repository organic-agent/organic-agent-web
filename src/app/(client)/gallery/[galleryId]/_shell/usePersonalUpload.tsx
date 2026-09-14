"use client";

/**
 * 개인 갤러리 업로드 · AI 정리 — 작가 1단계의 훅과 부품(useUploadRun · UploadModal · ProgressBar · useAnalysisWatch ·
 * RecoveryBanner)을 그대로 묶어 클라이언트 셸에서 쓴다 (묶음 B, 2026-09-14)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/usePersonalUpload.tsx
 *
 * 소유자 · 파트너 둘 다 올릴 수 있다(서버 requireUploader). 플랜 상한은 모달이 미리 검사해 넘는 만큼은 못 담는다.
 * 큐가 비면 AI 분석을 요청하고, 끝나면 폴더 · 사진을 다시 읽고 같은 이름 컨셉을 합친다. 끊김 복구(이 브라우저가
 * 발급한 PENDING)는 작가 화면과 같다. 하단 바에 꽂을 진행 막대 · 버튼과 모달 · 배너를 JSX로 돌려준다.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { duplicateConceptGroups, mergeDuplicateConcepts, normalizeFolders } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/folderView";
import { RecoveryBanner } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/RecoveryBanner";
import { ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { UploadModal } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/UploadModal";
import { ProgressBar } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/UploadProgress";
import { forgetUploaded, parseRemembered, readRememberedRaw, readUploadActiveRaw, subscribeRemembered } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/uploadMemory";
import { matchRecoveryFiles, recoverablePending } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/uploadRecovery";
import { describeUploadError, formatEta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/uploadSupport";
import { analysisCounts, useAnalysisWatch } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/useAnalysisWatch";
import { useUploadRun } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/useUploadRun";
import { CloudUploadIcon, ErrorIcon, PauseIcon, PlayIcon, RefreshIcon, SparkleIcon } from "@/components/icons";
import { isAnalysisActive } from "@/lib/api/analysis";
import { listConceptFolders, type ConceptFolderResponse } from "@/lib/api/conceptFolders";
import { deletePhotos, listAllPhotos, type PhotoResponse } from "@/lib/api/photos";

export function usePersonalUpload({
  galleryId,
  enabled,
  photos,
  photosLoadedAt,
  reviewedIds,
  setPhotos,
  setFolders,
  refreshPhotos,
  planMaxPhotoCount,
}: {
  galleryId: number;
  /** 개인 갤러리의 업로드 · 컨셉 분류 단계일 때만 */
  enabled: boolean;
  photos: PhotoResponse[] | null;
  /** 사진 목록을 마지막으로 읽은 시각 — 끊김 복구가 "그 뒤 발급된 것"을 가른다 */
  photosLoadedAt: number;
  reviewedIds: ReadonlySet<number>;
  setPhotos: (photos: PhotoResponse[]) => void;
  setFolders: (folders: ConceptFolderResponse[]) => void;
  refreshPhotos: () => Promise<void>;
  /** 플랜 사진 상한 — 모달이 넘는 만큼은 못 담게 한다 */
  planMaxPhotoCount: number | null;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const reviewedIdsRef = useRef(reviewedIds);
  useEffect(() => {
    reviewedIdsRef.current = reviewedIds;
  }, [reviewedIds]);
  const lastEmbeddedRefreshRef = useRef(0);
  const mergingRef = useRef(false);

  const allPhotos = useMemo(() => (photos ?? []).filter((p) => p.status === "UPLOADED"), [photos]);
  const pendingPhotos = useMemo(() => (photos ?? []).filter((p) => p.status === "PENDING"), [photos]);
  const existingNames = useMemo(() => new Set(allPhotos.map((p) => p.originalFileName)), [allPhotos]);

  // ── 업로드 실행기 — 큐가 비면 분석 잡을 요청한다 ──
  const requestAnalysisRef = useRef<() => Promise<void>>(async () => {});
  const { run, start, abort, pause, resume, retryFailed, reset } = useUploadRun(galleryId, {
    onBatchUploaded: () => void refreshPhotos(),
    onFinished: async ({ done, failed, aborted }) => {
      await refreshPhotos();
      if (aborted) setNotice(`업로드를 중단했어요. ${done}장은 올라갔어요.`);
      else if (failed === 0) setNotice(`${done}장 업로드 완료 · AI가 폴더로 정리하고 있어요`);
      if (done > 0) void requestAnalysisRef.current();
      if (failed === 0) reset();
    },
  });
  const uploading = run.phase === "running" || run.phase === "paused";
  const uploadFailedIdle = run.phase === "finished" && !run.aborted && run.failed > 0;

  const mergeDuplicates = useCallback(
    async (list: ConceptFolderResponse[]) => {
      if (mergingRef.current || duplicateConceptGroups(list).length === 0) return;
      mergingRef.current = true;
      try {
        await mergeDuplicateConcepts(galleryId, list);
        const f = await listConceptFolders(galleryId);
        setFolders(f);
      } catch (err) {
        setNotice(describeUploadError(err));
      } finally {
        mergingRef.current = false;
      }
    },
    [galleryId, setFolders],
  );

  // ── AI 분석 감시 — 끝나면 폴더 · 사진 재조회 ──
  const analysis = useAnalysisWatch(
    galleryId,
    { enabled: enabled && (uploading || (photos?.length ?? 0) > 0), uploading },
    {
      onDone: () => {
        setNotice(null);
        void (async () => {
          const [f, p] = await Promise.all([listConceptFolders(galleryId).catch(() => null), listAllPhotos(galleryId).catch(() => null)]);
          if (f) setFolders(f);
          if (p) setPhotos(p);
          if (f && p) await mergeDuplicates(normalizeFolders(f, p.filter((x) => x.status === "UPLOADED"), new Set(reviewedIdsRef.current)));
        })();
      },
      onEmbeddedChange: () => {
        const now = Date.now();
        if (now - lastEmbeddedRefreshRef.current < 10_000) return;
        lastEmbeddedRefreshRef.current = now;
        void refreshPhotos();
      },
    },
  );
  useEffect(() => {
    requestAnalysisRef.current = analysis.request;
  }, [analysis.request]);
  const aiJob = analysis.job;
  const aiActive = isAnalysisActive(aiJob);
  const aiCategorizing = aiJob?.status === "CATEGORIZING";
  const aiFailed = aiJob?.status === "FAILED" && !aiActive;
  const aiCounts = analysisCounts(aiJob, analysis.summary);
  const aiCanMaterialize = aiFailed && aiCounts !== null && aiCounts.expected > 0 && aiCounts.scored >= aiCounts.expected;

  // ── 끊김 복구 — 이 브라우저가 발급한 PENDING ──
  const rememberedRaw = useSyncExternalStore(subscribeRemembered, () => readRememberedRaw(galleryId), () => "");
  const remembered = useMemo(() => parseRemembered(rememberedRaw), [rememberedRaw]);
  const otherTabUploading = useSyncExternalStore(subscribeRemembered, () => readUploadActiveRaw(galleryId), () => "") === "1";
  const recoverable = useMemo(
    () => (!enabled || uploading || otherTabUploading ? [] : recoverablePending(pendingPhotos, remembered, photosLoadedAt)),
    [enabled, uploading, otherTabUploading, pendingPhotos, remembered, photosLoadedAt],
  );
  useEffect(() => {
    if (uploading || photos === null) return;
    const pendingIds = new Set(pendingPhotos.map((p) => p.photoId));
    const stale = remembered.filter((item) => !pendingIds.has(item.photoId) && item.issuedAt < photosLoadedAt).map((item) => item.photoId);
    if (stale.length > 0) forgetUploaded(galleryId, stale);
  }, [uploading, photos, pendingPhotos, remembered, photosLoadedAt, galleryId]);
  function onRecoveryFiles(files: File[]) {
    const { resume: resumeItems, fresh } = matchRecoveryFiles(files, recoverable, remembered);
    setNotice(resumeItems.length === 0 ? "짝이 맞는 파일이 없어 새 사진으로 올려요" : fresh.length > 0 ? `${resumeItems.length}장은 이어서, ${fresh.length}장은 새로 올려요` : null);
    void start(fresh, resumeItems);
  }
  async function discardPending() {
    if (discarding || recoverable.length === 0) return;
    setDiscarding(true);
    const ids = recoverable.map((p) => p.photoId);
    try {
      await deletePhotos(galleryId, ids);
      forgetUploaded(galleryId, ids);
    } catch (err) {
      setNotice(describeUploadError(err));
    } finally {
      await refreshPhotos();
      setDiscarding(false);
    }
  }

  // ── 하단 바 조각 ──
  const stalledNote = analysis.stalled ? "멈춘 것 같아요 · 서버가 다시 시도해요" : null;
  const uploadProgress: ReactNode = uploading ? (
    <ProgressBar
      icon={<CloudUploadIcon size={18} />}
      title={`업로드 ${run.done} / ${run.total}`}
      ratio={run.ratio}
      sub={[run.phase === "paused" ? "일시정지" : formatEta(run.etaSeconds), run.failed > 0 ? `${run.failed}장 실패` : null].filter(Boolean).join(" · ") || undefined}
    />
  ) : uploadFailedIdle ? (
    <span className="flex min-w-0 items-center gap-2 type-content-s text-contents-light-bgd-default">
      <span className="flex shrink-0 text-function-warning-default">
        <ErrorIcon size={18} />
      </span>
      <span className="min-w-0 truncate">
        <b className="font-semibold">{run.failed}장을 올리지 못했어요</b>
        {run.error ? ` · ${run.error}` : " · 네트워크를 확인한 뒤 다시 올려 주세요"}
      </span>
    </span>
  ) : null;
  const aiProgress: ReactNode =
    !aiFailed && (aiActive || (uploading && aiCounts !== null && aiCounts.expected > 0)) ? (
      aiCategorizing ? (
        <ProgressBar icon={<SparkleIcon size={18} />} title="AI가 컨셉 · 세부 폴더로 나누고 있어요" ratio={null} indeterminate sub={stalledNote ?? "끝나면 알림으로 알려 드려요"} />
      ) : (
        <ProgressBar
          icon={<SparkleIcon size={18} />}
          title={`AI 분석 ${aiCounts?.scored ?? 0} / ${aiCounts?.expected ?? 0}`}
          ratio={aiCounts && aiCounts.expected > 0 ? (aiCounts.embedded + aiCounts.scored) / (2 * aiCounts.expected) : null}
          sub={stalledNote ?? (aiCounts && aiCounts.embedded < aiCounts.expected ? "임베딩 · 점수" : "점수")}
        />
      )
    ) : aiFailed && !uploading ? (
      <span className="flex min-w-0 items-center gap-2 type-content-s text-contents-light-bgd-default">
        <span className="flex shrink-0 text-function-warning-default">
          <ErrorIcon size={18} />
        </span>
        <span className="min-w-0 truncate">
          <b className="font-semibold">AI 정리에 실패했어요</b>
          {aiJob?.error ? ` · ${aiJob.error}` : ""}
        </span>
      </span>
    ) : null;
  const progress: ReactNode | null =
    uploadProgress || aiProgress ? (
      <>
        {uploadProgress}
        {aiProgress}
      </>
    ) : null;

  /** 업로드 중이면 일시정지 · 취소, 아니면 실패 다시 · AI 다시 · 폴더 만들기 */
  const actions: ReactNode = uploading ? (
    <>
      <ShellCta kind="ghost" onClick={run.phase === "paused" ? resume : pause}>
        {run.phase === "paused" ? <PlayIcon size={18} /> : <PauseIcon size={18} />}
        {run.phase === "paused" ? "계속" : "일시정지"}
      </ShellCta>
      <ShellCta kind="ghost" onClick={abort}>
        취소
      </ShellCta>
    </>
  ) : (
    <>
      {uploadFailedIdle && (
        <ShellCta kind="secondary" onClick={retryFailed}>
          <RefreshIcon size={18} />
          실패 {run.failed}장 다시 올리기
        </ShellCta>
      )}
      {(aiFailed || analysis.error) && (
        <ShellCta kind="secondary" onClick={() => void analysis.request()}>
          <SparkleIcon size={18} />
          AI 정리 다시 시도
        </ShellCta>
      )}
      {aiCanMaterialize && (
        <ShellCta kind="secondary" onClick={() => void analysis.materialize()}>
          폴더 만들기
        </ShellCta>
      )}
    </>
  );
  const recoveryBanner: ReactNode | null =
    recoverable.length > 0 ? <RecoveryBanner count={recoverable.length} onFiles={onRecoveryFiles} onDiscard={() => void discardPending()} discarding={discarding} /> : null;
  const hint = notice ?? (recoverable.length > 0 ? `${allPhotos.length} / ${allPhotos.length + recoverable.length} 올라옴 · ${recoverable.length}장은 기다리는 중` : null);
  const modal: ReactNode = uploadOpen ? (
    <UploadModal
      existingCount={photos?.length ?? 0}
      existingNames={existingNames}
      planMaxPhotoCount={planMaxPhotoCount}
      onClose={() => setUploadOpen(false)}
      onStart={(files) => {
        setUploadOpen(false);
        setNotice(null);
        void start(files);
      }}
    />
  ) : null;

  return { uploading, aiActive, aiFailed, aiCategorizing, progress, actions, recoveryBanner, hint, notice, clearNotice: () => setNotice(null), modal, modalOpen: uploadOpen, openUpload: () => setUploadOpen(true) };
}

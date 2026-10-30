"use client";

/**
 * 새 공유폴더 — 이름 · 범위(선택한 사진 / 지금 보는 사진 / 별점으로 / 컨셉 폴더 / 모든 사진) · 표지(선택)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/CreateShareFolderModal.tsx
 *
 * 컨셉 폴더 · 모든 사진은 서버에 범위로 보내 한 번에 담고, 나머지는 id를 보낸다. 어느 쪽이든 만든 순간의
 * 사진을 담을 뿐 원본 폴더를 따라가지 않는다(공유폴더는 폴더와 따로 산다). 만들면 링크(7일)도 같이 생긴다.
 * "지금 보는 사진"은 셀렉 화면이 넘겨 준 폴더 + 필터 결과(요약이 줄 아래 작게, 이름 기본값도 그 요약)이고,
 * "별점으로"는 필터를 안 걸고도 모달 안에서 점수를 골라 만든다(장수는 갤러리 전체 기준, 이름 기본값 "★5 ★4") — 이슈 149.
 */

import { useState } from "react";
import { track } from "@/lib/analytics";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { Checkbox } from "@/components/ui/Checkbox";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import { createCollabSession, openManualCollabSession, type CollabSessionResponse } from "@/lib/api/collab";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { PhotoResponse } from "@/lib/api/photos";
import { ScoreStars, scoresLabel } from "./SelectFilter";

type Scope = "selected" | "visible" | "score" | "concept" | "all";
/** 셀렉 화면이 보고 있는 사진 — 폴더 + 필터 결과. summary는 "상반신 · 선택 안 함 · ★5 ★4"(없으면 빈 문자열) */
export type VisibleScope = { photoIds: number[]; summary: string };

const SCORE_ROWS = [5, 4, 3, 2, 1, 0];

function ScopeRow({ checked, label, sub, count, disabled = false, onPick }: { checked: boolean; label: string; sub?: string; count: number; disabled?: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onPick}
      className={`flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-(--radius-8) border px-3 py-1.5 text-left type-content-m transition-colors duration-fast disabled:cursor-not-allowed disabled:text-contents-light-bgd-disabled ${
        checked ? "border-contents-light-bgd-default bg-surface-default-lightness text-contents-light-bgd-default" : "border-border-default text-contents-light-bgd-sub hover:bg-surface-default-lightness"
      }`}
    >
      <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${checked ? "border-contents-light-bgd-default" : "border-border-default"}`}>
        {checked && <span className="size-2 rounded-full bg-contents-light-bgd-default" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{label}</span>
        {sub && <span className="truncate type-content-xs text-contents-light-bgd-weakness">{sub}</span>}
      </span>
      <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness tabular-nums">{count}장</span>
    </button>
  );
}

export function CreateShareFolderModal({
  galleryId,
  photos,
  folders,
  pickedIds,
  visible = null,
  onClose,
  onCreated,
}: {
  galleryId: number;
  photos: PhotoResponse[];
  folders: ConceptFolderResponse[] | null;
  /** 선택한 사진 id */
  pickedIds: ReadonlySet<number>;
  /** 지금 보는 사진(셀렉 화면) — null이면 그 줄을 안 그린다 */
  visible?: VisibleScope | null;
  onClose: () => void;
  /** 만들어진 공유폴더(링크 포함) — 초대 모달이 이 링크 카드로 바로 이어진다(팀 노션 73번) */
  onCreated: (session: CollabSessionResponse) => void;
}) {
  const concepts = (folders ?? []).map((c) => ({ id: c.id, name: c.name, photoIds: c.details.flatMap((d) => d.photoIds) }));
  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>(pickedIds.size > 0 ? "selected" : visible?.summary ? "visible" : concepts.length > 0 ? "concept" : "all");
  const [conceptIds, setConceptIds] = useState<Set<number>>(() => new Set(concepts.length > 0 ? [concepts[0].id] : []));
  /** "별점으로"의 점수(0 = 별점 없음) */
  const [scores, setScores] = useState<Set<number>>(() => new Set());
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverTitle, setCoverTitle] = useState("");
  const [coverAuthor, setCoverAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosenConcepts = concepts.filter((c) => conceptIds.has(c.id));
  const scoreCount = (s: number) => photos.filter((p) => (p.score ?? 0) === s).length;
  const scorePhotoIds = photos.filter((p) => scores.has(p.score ?? 0)).map((p) => p.photoId);
  const photoIds =
    scope === "selected"
      ? [...pickedIds]
      : scope === "visible"
        ? visible?.photoIds ?? []
        : scope === "score"
          ? scorePhotoIds
          : scope === "all"
            ? photos.map((p) => p.photoId)
            : [...new Set(chosenConcepts.flatMap((c) => c.photoIds))];
  const defaultName =
    scope === "selected"
      ? "선택한 사진"
      : scope === "visible"
        ? visible?.summary || "지금 보는 사진"
        : scope === "score"
          ? scoresLabel(scores) || "별점으로"
          : scope === "all"
            ? "모든 사진"
            : chosenConcepts.map((c) => c.name).join(" + ");
  const canSubmit = !busy && photoIds.length > 0 && (scope !== "concept" || chosenConcepts.length > 0);

  function toggleIn(set: (fn: (prev: Set<number>) => Set<number>) => void, id: number) {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const body = { name: name.trim() || defaultName, coverTitle: coverTitle.trim() || null, coverAuthor: coverAuthor.trim() || null };
      const created =
        scope === "concept"
          ? await createCollabSession(galleryId, { ...body, scope: { type: "CONCEPT_FOLDERS", conceptFolderIds: chosenConcepts.map((c) => c.id) } })
          : scope === "all"
            ? await createCollabSession(galleryId, { ...body, scope: { type: "ALL" } })
            : await openManualCollabSession(galleryId, body, photoIds);
      track("collab_session_created", { gallery_id: galleryId, photo_count: created.photoCount, source: scope === "visible" || scope === "score" ? "filter" : "share_folder" });
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "공유폴더를 만들지 못했어요 · 다시 시도해 주세요");
      setBusy(false);
    }
  }

  return (
    <GalleryModalShell title="새 공유폴더" maxWidthClassName="max-w-105" onClose={onClose}>
      <div className="mt-3 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="type-label-semibold-xs text-contents-light-bgd-default">이름</span>
          <TextField value={name} onChange={setName} placeholder={defaultName} className="h-10" />
        </label>

        <div role="radiogroup" aria-label="범위" className="flex flex-col gap-1.5">
          <span className="type-label-semibold-xs text-contents-light-bgd-default">범위</span>
          <ScopeRow checked={scope === "selected"} label="선택한 사진" count={pickedIds.size} disabled={pickedIds.size === 0} onPick={() => setScope("selected")} />
          {visible && (
            <ScopeRow
              checked={scope === "visible"}
              label="지금 보는 사진"
              sub={visible.summary || "조건 없음"}
              count={visible.photoIds.length}
              disabled={visible.photoIds.length === 0}
              onPick={() => setScope("visible")}
            />
          )}
          <ScopeRow checked={scope === "score"} label="별점으로" sub={scoresLabel(scores) || "점수를 고르세요"} count={scorePhotoIds.length} onPick={() => setScope("score")} />
          {scope === "score" && (
            <div className="ml-3 flex flex-wrap gap-x-3 gap-y-0.5 rounded-(--radius-8) bg-surface-default-lightness px-2 py-1.5">
              {SCORE_ROWS.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 rounded-(--radius-4) px-1.5 py-1.5 type-content-s text-contents-light-bgd-default hover:bg-surface-default-light">
                  <Checkbox checked={scores.has(s)} onChange={() => toggleIn(setScores, s)} />
                  {s === 0 ? <span className="text-contents-light-bgd-sub">별점 없음</span> : <ScoreStars score={s} size={13} />}
                  <span className="type-content-xs text-contents-light-bgd-weakness tabular-nums">{scoreCount(s)}</span>
                </label>
              ))}
            </div>
          )}
          <ScopeRow
            checked={scope === "concept"}
            label="컨셉 폴더"
            count={scope === "concept" ? photoIds.length : concepts.reduce((n, c) => n + c.photoIds.length, 0)}
            disabled={concepts.length === 0}
            onPick={() => setScope("concept")}
          />
          {scope === "concept" && (
            <div className="ml-3 flex flex-col gap-0.5 rounded-(--radius-8) bg-surface-default-lightness px-2 py-1.5">
              {concepts.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-(--radius-4) px-1.5 py-1.5 type-content-s text-contents-light-bgd-default hover:bg-surface-default-light">
                  <Checkbox checked={conceptIds.has(c.id)} onChange={() => toggleIn(setConceptIds, c.id)} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="type-content-xs text-contents-light-bgd-weakness tabular-nums">{c.photoIds.length}</span>
                </label>
              ))}
            </div>
          )}
          <ScopeRow checked={scope === "all"} label="모든 사진" count={photos.length} onPick={() => setScope("all")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <button type="button" aria-expanded={coverOpen} onClick={() => setCoverOpen((v) => !v)} className="self-start cursor-pointer type-label-semibold-xs text-contents-light-bgd-sub underline underline-offset-2 hover:text-contents-light-bgd-default">
            {coverOpen ? "표지 접기" : "표지 넣기 (선택)"}
          </button>
          {coverOpen && (
            <div className="flex flex-col gap-1.5">
              <TextField value={coverTitle} onChange={setCoverTitle} placeholder="표지 제목" aria-label="표지 제목" className="h-10" />
              <TextField value={coverAuthor} onChange={setCoverAuthor} placeholder="보내는 사람" aria-label="보내는 사람" className="h-10" />
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="type-content-xs text-function-error-default">
            {error}
          </p>
        )}
        <GalleryModalButtons onClose={onClose} onConfirm={() => void submit()} confirmLabel={busy ? "만드는 중…" : `만들기 · ${photoIds.length}장`} disabled={!canSubmit} />
      </div>
    </GalleryModalShell>
  );
}

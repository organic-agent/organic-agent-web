"use client";

/**
 * 새 공유폴더 — 이름 · 범위(선택한 사진 / 컨셉 폴더 / 모든 사진) · 표지(선택)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/CreateShareFolderModal.tsx
 *
 * 컨셉 폴더 · 모든 사진은 서버에 범위로 보내 한 번에 담고, 선택한 사진은 id를 보낸다. 어느 쪽이든 만든 순간의
 * 사진을 담을 뿐 원본 폴더를 따라가지 않는다(공유폴더는 폴더와 따로 산다). 만들면 링크(7일)도 같이 생긴다.
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { Checkbox } from "@/components/ui/Checkbox";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import { createCollabSession, openManualCollabSession, type CollabSessionResponse } from "@/lib/api/collab";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { PhotoResponse } from "@/lib/api/photos";

type Scope = "selected" | "concept" | "all";

function ScopeRow({ checked, label, count, disabled = false, onPick }: { checked: boolean; label: string; count: number; disabled?: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onPick}
      className={`flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-(--radius-8) border px-3 text-left type-content-m transition-colors duration-fast disabled:cursor-not-allowed disabled:text-contents-light-bgd-disabled ${
        checked ? "border-contents-light-bgd-default bg-surface-default-lightness text-contents-light-bgd-default" : "border-border-default text-contents-light-bgd-sub hover:bg-surface-default-lightness"
      }`}
    >
      <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${checked ? "border-contents-light-bgd-default" : "border-border-default"}`}>
        {checked && <span className="size-2 rounded-full bg-contents-light-bgd-default" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness tabular-nums">{count}장</span>
    </button>
  );
}

export function CreateShareFolderModal({
  galleryId,
  photos,
  folders,
  pickedIds,
  onClose,
  onCreated,
}: {
  galleryId: number;
  photos: PhotoResponse[];
  folders: ConceptFolderResponse[] | null;
  /** 선택한 사진 id */
  pickedIds: ReadonlySet<number>;
  onClose: () => void;
  /** 만들어진 공유폴더(링크 포함) — 초대 모달이 이 링크 카드로 바로 이어진다(팀 노션 73번) */
  onCreated: (session: CollabSessionResponse) => void;
}) {
  const concepts = (folders ?? []).map((c) => ({ id: c.id, name: c.name, photoIds: c.details.flatMap((d) => d.photoIds) }));
  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>(pickedIds.size > 0 ? "selected" : concepts.length > 0 ? "concept" : "all");
  const [conceptIds, setConceptIds] = useState<Set<number>>(() => new Set(concepts.length > 0 ? [concepts[0].id] : []));
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverTitle, setCoverTitle] = useState("");
  const [coverAuthor, setCoverAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosenConcepts = concepts.filter((c) => conceptIds.has(c.id));
  const photoIds =
    scope === "selected" ? [...pickedIds] : scope === "all" ? photos.map((p) => p.photoId) : [...new Set(chosenConcepts.flatMap((c) => c.photoIds))];
  const defaultName =
    scope === "selected" ? "선택한 사진" : scope === "all" ? "모든 사진" : chosenConcepts.map((c) => c.name).join(" + ");
  const canSubmit = !busy && photoIds.length > 0 && (scope !== "concept" || chosenConcepts.length > 0);

  function toggleConcept(id: number) {
    setConceptIds((prev) => {
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
                  <Checkbox checked={conceptIds.has(c.id)} onChange={() => toggleConcept(c.id)} />
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

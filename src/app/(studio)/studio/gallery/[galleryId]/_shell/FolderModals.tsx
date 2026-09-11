"use client";

/**
 * 검토 동작 모달 4종 — 폴더 이름(컨셉 · 세부 추가) · 폴더 삭제 확인 · 사진 폴더로 이동 · 사진 삭제 확인
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/FolderModals.tsx
 *
 * 서버 규칙(2026-09-11 실측): 폴더 삭제 → 안의 사진은 지워지지 않고 미분류가 된다. 사진은 세부 폴더 하나에만
 * 속하고, 이동 대상 null = 미분류로 빼기. 사진 삭제는 휴지통 이동(보관 뒤 서버가 자동 삭제, 복원 UI 없음).
 * 만들기 · 삭제 · 이동은 본문 없이 끝나므로 호출자가 다시 조회한다(onConfirm 안에서).
 */

import { useEffect, useId, useState, type FormEvent } from "react";
import { FolderOffIcon } from "@/components/icons";
import { TextField } from "@/components/ui/TextField";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "@/app/(studio)/studio/_components/GalleryModalShell";
import type { ConceptFolderResponse, DetailFolderResponse } from "@/lib/api/conceptFolders";
import { describeUploadError } from "./uploadSupport";

/** 모달 공통 — 확인 동작의 진행 · 오류 */
function useConfirmAction(action: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(describeUploadError(err));
      setBusy(false);
    }
  }
  return { busy, error, run };
}

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
      {text}
    </p>
  );
}

// ── 폴더 이름 — 컨셉 · 세부 추가 ──

export function FolderNameModal({
  kind,
  parentName,
  onClose,
  onSubmit,
}: {
  kind: "concept" | "detail";
  /** 세부 폴더일 때 부모 컨셉 이름 */
  parentName?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 100;
  const { busy, error, run } = useConfirmAction(() => onSubmit(trimmed));

  useEffect(() => {
    document.getElementById(`${id}-name`)?.focus();
  }, [id]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid) void run();
  }

  return (
    <GalleryModalShell
      title={kind === "concept" ? "컨셉 폴더 추가" : "세부 폴더 추가"}
      desc={
        kind === "concept"
          ? "컨셉은 큰 묶음이에요. 안에 세부 폴더를 두고 사진을 나눠요."
          : `"${parentName ?? ""}" 아래에 만들어요. 사진은 세부 폴더에 담겨요.`
      }
      maxWidthClassName="max-w-105"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label htmlFor={`${id}-name`} className="mb-1.5 block type-label-semibold-s text-contents-light-bgd-default">
          폴더 이름
        </label>
        <TextField
          id={`${id}-name`}
          value={name}
          onChange={setName}
          placeholder={kind === "concept" ? "예: 야외 정원" : "예: 산책 스냅"}
          error={name.length > 0 && !valid}
          className="mb-5 h-11 px-4"
        />
        <ErrorLine text={error} />
        <GalleryModalButtons
          onClose={onClose}
          onConfirm={() => void run()}
          confirmLabel={busy ? "만드는 중…" : "만들기"}
          disabled={!valid || busy}
        />
      </form>
    </GalleryModalShell>
  );
}

// ── 폴더 삭제 확인 ──

export type FolderDeleteTarget =
  | { kind: "concept"; concept: ConceptFolderResponse }
  | { kind: "detail"; concept: ConceptFolderResponse; detail: DetailFolderResponse };

export function FolderDeleteModal({
  target,
  onClose,
  onConfirm,
}: {
  target: FolderDeleteTarget;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { busy, error, run } = useConfirmAction(onConfirm);
  const photoCount =
    target.kind === "concept"
      ? target.concept.details.reduce((n, d) => n + d.photoIds.length, 0)
      : target.detail.photoIds.length;
  const name = target.kind === "concept" ? target.concept.name : target.detail.name;

  return (
    <GalleryModalShell title="폴더를 삭제할까요?" maxWidthClassName="max-w-105" onClose={onClose}>
      <p className="mb-6 type-content-m leading-relaxed text-contents-light-bgd-sub">
        <b className="text-contents-light-bgd-default">{name}</b>
        {target.kind === "concept" && target.concept.details.length > 0
          ? `와 세부 폴더 ${target.concept.details.length}개가 사라져요.`
          : " 폴더가 사라져요."}{" "}
        {photoCount > 0 ? (
          <>
            안에 있던 사진 <b className="text-contents-light-bgd-default">{photoCount}장</b>은 지워지지 않고{" "}
            <b className="text-contents-light-bgd-default">미분류</b>로 옮겨져요.
          </>
        ) : (
          "안에 사진은 없어요."
        )}
      </p>
      <ErrorLine text={error} />
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void run()}
        confirmLabel={busy ? "삭제 중…" : "폴더 삭제"}
        confirmVariant="danger"
        disabled={busy}
      />
    </GalleryModalShell>
  );
}

// ── 사진 폴더로 이동 ──

export function MovePhotosModal({
  count,
  folders,
  currentDetailId,
  onClose,
  onConfirm,
}: {
  count: number;
  folders: ConceptFolderResponse[];
  /** 지금 보고 있는 세부 폴더(있으면 목록에서 "현재"로 표시) */
  currentDetailId: number | null;
  onClose: () => void;
  /** null = 미분류로 빼기 */
  onConfirm: (targetDetailId: number | null) => Promise<void>;
}) {
  const [target, setTarget] = useState<number | null | undefined>(undefined);
  const { busy, error, run } = useConfirmAction(() => onConfirm(target ?? null));
  const chosen = target !== undefined;

  return (
    <GalleryModalShell
      title={`${count}장을 어디로 옮길까요?`}
      desc="사진은 세부 폴더 하나에만 담겨요. 옮기면 원래 폴더에서는 빠져요."
      maxWidthClassName="max-w-110"
      onClose={onClose}
    >
      <div role="radiogroup" aria-label="옮길 폴더" className="scrollbar-slim mb-5 flex max-h-80 flex-col overflow-y-auto pr-1">
        {folders.length === 0 && (
          <p className="px-2 py-3 type-content-s text-contents-light-bgd-sub">아직 폴더가 없어요. 컨셉 폴더를 먼저 만들어 주세요.</p>
        )}
        {folders.map((concept) => (
          <div key={concept.id} className="mb-1.5">
            <p className="px-2 pt-1.5 pb-0.5 type-label-semibold-xs text-contents-light-bgd-weakness">{concept.name}</p>
            {concept.details.length === 0 && (
              <p className="px-2 py-1 type-content-xs text-contents-light-bgd-disabled">세부 폴더가 없어요</p>
            )}
            {concept.details.map((detail) => {
              const isCurrent = detail.id === currentDetailId;
              const checked = target === detail.id;
              return (
                <button
                  key={detail.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={isCurrent}
                  onClick={() => setTarget(detail.id)}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-(--radius-8) px-2.5 py-2 text-left type-content-s transition-colors duration-fast hover:bg-surface-default-lightness disabled:cursor-default disabled:hover:bg-transparent ${
                    checked ? "bg-brand-secondary-background font-semibold text-contents-light-bgd-default" : "text-contents-light-bgd-default"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid size-4 shrink-0 place-items-center rounded-full border ${
                      checked ? "border-contents-light-bgd-default" : "border-border-default"
                    }`}
                  >
                    {checked && <span className="size-2 rounded-full bg-contents-light-bgd-default" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{detail.name}</span>
                  <span className="type-content-xs text-contents-light-bgd-weakness">
                    {isCurrent ? "현재" : detail.photoIds.length}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={target === null}
          onClick={() => setTarget(null)}
          className={`mt-1 flex w-full cursor-pointer items-center gap-2 rounded-(--radius-8) border-t border-divider-default px-2.5 py-2.5 text-left type-content-s transition-colors duration-fast hover:bg-surface-default-lightness ${
            target === null ? "bg-brand-secondary-background font-semibold text-contents-light-bgd-default" : "text-contents-light-bgd-default"
          }`}
        >
          <span className="flex shrink-0 text-contents-light-bgd-weakness">
            <FolderOffIcon size={16} />
          </span>
          미분류로 빼기
        </button>
      </div>
      <ErrorLine text={error} />
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void run()}
        confirmLabel={busy ? "옮기는 중…" : "옮기기"}
        disabled={!chosen || busy}
      />
    </GalleryModalShell>
  );
}

// ── 사진 삭제 확인 ──

export function DeletePhotosModal({
  count,
  onClose,
  onConfirm,
}: {
  count: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { busy, error, run } = useConfirmAction(onConfirm);
  return (
    <GalleryModalShell
      title={`${count}장을 삭제할까요?`}
      desc="삭제한 사진은 갤러리와 폴더에서 바로 사라져요. 사진이 다 빠져 비게 된 폴더는 함께 사라져요. 화면에서 되살릴 수는 없어요."
      maxWidthClassName="max-w-105"
      onClose={onClose}
    >
      <ErrorLine text={error} />
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={() => void run()}
        confirmLabel={busy ? "삭제 중…" : `${count}장 삭제`}
        confirmVariant="danger"
        disabled={busy}
      />
    </GalleryModalShell>
  );
}

"use client";

/**
 * 새 갤러리 만들기 모달 (폼 입력 + 생성)
 * 위치: src/app/(photographer)/galleries/_components/NewGalleryModal.tsx
 *
 * 갤러리 목록 페이지에서 여닫는 생성 폼 모달이다.
 * POST /api/v1/galleries로 실제 갤러리를 만든다 — 생성 직후엔 DRAFT라
 * 부부에게 보이지 않으며, 그 안내는 생성 토스트가 맡는다.
 *
 * 오류 처리: 404(스튜디오 없음)는 온보딩 회송, 그 외는 배너로 표시하고
 * 입력값을 유지해 재시도할 수 있게 한다.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  createGallery,
  toSelectionDeadline,
} from "@/lib/api/galleries";
import {
  createDefaultGalleryForm,
  isGalleryFormValid,
} from "../../_lib/galleryForm";
import type { GalleryListItem } from "../_lib/useGalleryList";
import { listWorkspaces, type WorkspaceResponse } from "@/lib/api/workspaces";
import { GalleryFormFields } from "./GalleryFormFields";
import { GalleryModalButtons, GalleryModalShell } from "./GalleryModalShell";

export function NewGalleryModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (gallery: GalleryListItem) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => createDefaultGalleryForm());
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [shootType, setShootType] = useState<"REHEARSAL" | "CEREMONY" | "OTHER">("REHEARSAL");
  const canCreate = isGalleryFormValid(form) && workspaceId !== null && !submitting;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listWorkspaces()
      .then((items) => {
        if (cancelled) return;
        setWorkspaces(items);
        setWorkspaceId((current) => current ?? items[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setBanner("작업공간을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleClose() {
    if (submitting) return;
    onClose();
    setForm(createDefaultGalleryForm());
    setShootType("REHEARSAL");
    setBanner(null);
  }

  async function submitGallery() {
    if (!canCreate) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const created = await createGallery({
        workspaceId: workspaceId!,
        title: form.name.trim(),
        selectionDeadline: form.dueDate
          ? toSelectionDeadline(form.dueDate)
          : null,
        maxSelectablePhotoCount: form.target.trim()
          ? Number(form.target)
          : null,
        shootType,
      });
      onCreated({ ...created, selectedCount: 0 });
      onClose();
      setForm(createDefaultGalleryForm());
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // 스튜디오가 없는 계정 — 갤러리는 스튜디오에 속하므로 온보딩으로 회송
        router.push("/onboarding/studio");
        return;
      }
      setBanner(
        err instanceof ApiError
          ? err.message
          : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <GalleryModalShell
      title="새 갤러리 만들기"
      desc="이름만 정하면 바로 만들 수 있어요."
      onClose={handleClose}
    >
      <GalleryFormFields
        values={form}
        onChange={setForm}
        namePlaceholder="예: 지민 & 하윤 웨딩"
      />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <label className="type-body-small text-fg-neutral-muted">
          작업공간
          <select
            value={workspaceId ?? ""}
            onChange={(event) => setWorkspaceId(Number(event.target.value))}
            className="mt-1.5 h-10 w-full rounded-(--radius-4) border border-stroke-neutral-muted bg-bg-layer-default px-3 text-fg-neutral"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} · {workspace.type === "PERSONAL" ? "개인" : "스튜디오"}
              </option>
            ))}
          </select>
        </label>
        <label className="type-body-small text-fg-neutral-muted">
          촬영 종류
          <select
            value={shootType}
            onChange={(event) => setShootType(event.target.value as typeof shootType)}
            className="mt-1.5 h-10 w-full rounded-(--radius-4) border border-stroke-neutral-muted bg-bg-layer-default px-3 text-fg-neutral"
          >
            <option value="REHEARSAL">리허설</option>
            <option value="CEREMONY">본식</option>
            <option value="OTHER">기타</option>
          </select>
        </label>
      </div>
      {banner && (
        <p role="alert" className="mb-4 text-center type-body-small text-fg-critical">
          {banner}
        </p>
      )}
      <GalleryModalButtons
        onClose={handleClose}
        onConfirm={submitGallery}
        confirmLabel={submitting ? "만드는 중…" : "갤러리 생성"}
        disabled={!canCreate}
      />
    </GalleryModalShell>
  );
}

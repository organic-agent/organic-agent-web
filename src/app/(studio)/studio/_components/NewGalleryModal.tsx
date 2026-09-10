"use client";

/**
 * 새 갤러리 만들기 모달 (와이어프레임 04 갤러리 모달)
 * 위치: src/app/(studio)/studio/_components/NewGalleryModal.tsx
 *
 * 개인 갤러리 온보딩과 같은 세 필드·문구로 갤러리를 만든다(POST /galleries).
 * 촬영 종류는 화면에 없고 개인과 같이 본식을 기본으로 보낸다(비우면 서버가 리허설로 저장해서).
 * 이용권은 프론트 소프트 게이트 — 성공하면 이 스튜디오 이용권을 하나 뺀다.
 *
 * 오류 처리: 404(스튜디오 없음)는 온보딩 회송, 그 외는 배너로 표시하고
 * 입력값을 유지해 재시도할 수 있게 한다.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  createGallery,
  toSelectionDeadline,
} from "@/lib/api/galleries";
import { consumeTicket } from "@/lib/studioTickets";
import {
  createDefaultGalleryForm,
  isGalleryFormValid,
} from "../../_lib/galleryForm";
import type { GalleryListItem } from "../_lib/useGalleryList";
import { GalleryFormFields } from "./GalleryFormFields";
import { GalleryModalButtons, GalleryModalShell } from "./GalleryModalShell";

export function NewGalleryModal({
  open,
  workspaceId,
  ticketsRemaining,
  onClose,
  onCreated,
}: {
  open: boolean;
  /** 갤러리를 소유할 스튜디오 — 스튜디오가 여럿일 때 어느 홈인지 못 박는다 */
  workspaceId: number;
  ticketsRemaining: number;
  onClose: () => void;
  onCreated: (gallery: GalleryListItem) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => createDefaultGalleryForm());
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const canCreate = isGalleryFormValid(form) && !submitting;

  function handleClose() {
    if (submitting) return;
    onClose();
    setForm(createDefaultGalleryForm());
    setBanner(null);
  }

  async function submitGallery() {
    if (!canCreate) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const created = await createGallery({
        workspaceId,
        title: form.name.trim(),
        selectionDeadline: form.dueDate
          ? toSelectionDeadline(form.dueDate)
          : null,
        maxSelectablePhotoCount: form.target.trim()
          ? Number(form.target)
          : null,
        shootType: "CEREMONY",
      });
      consumeTicket(workspaceId);
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
      title="갤러리 정보를 알려 주세요"
      desc="마감일과 장수는 나중에 갤러리 설정에서 바꿀 수 있어요."
      onClose={handleClose}
    >
      <GalleryFormFields values={form} onChange={setForm} />
      {banner && (
        <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      <p className="mb-3 type-content-xs text-contents-light-bgd-weakness">
        이용권 1개를 써요 · {ticketsRemaining}개 남음
      </p>
      <GalleryModalButtons
        onClose={handleClose}
        onConfirm={submitGallery}
        confirmLabel={submitting ? "만드는 중…" : "갤러리 만들기"}
        disabled={!canCreate}
      />
    </GalleryModalShell>
  );
}

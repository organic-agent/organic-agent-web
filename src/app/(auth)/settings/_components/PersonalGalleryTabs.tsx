"use client";

/**
 * 설정 › 개인 갤러리 — 정보(이름 · 선택 마감 · 고를 장수 · 플랜) · 파트너 · 갤러리 삭제 (묶음 D, 2026-09-23)
 * 위치: src/app/(auth)/settings/_components/PersonalGalleryTabs.tsx
 *
 * 스튜디오 설정과 같은 틀. 소유자만 들어온다(파트너는 내비에서 잠김 — 나가기 등 파트너 전용은 나중 이슈).
 * 저장은 PATCH galleries/{id}/personal — 선택 마감은 플랜 만료 전까지, 보관(ARCHIVED)된 갤러리는 읽기만.
 * 삭제는 휴지통 이동(DELETE galleries/{id}) — 복원 UI 없음, 보관 기간 뒤 자동 삭제(작가와 같음).
 */

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deadlineDateLabel } from "@/app/(studio)/_lib/galleryStatus";
import { PartnerInviteBody } from "@/app/(client)/gallery/[galleryId]/_shell/PartnerInviteBody";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import { getGallery, moveGalleryToTrash, toSelectionDeadline, updatePersonalGallery, type GalleryResponse } from "@/lib/api/galleries";
import { refreshMe } from "../_lib/refreshMe";
import { DangerConfirmModal } from "./DangerConfirmModal";
import { DangerButton, DangerCard, FieldLabel, ReadOnlyBox, Section } from "./SettingsShell";

/** 마감 일시 → 폼의 날짜(YYYY-MM-DD, 현지 시각) */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function usePersonalGallery(galleryId: number) {
  const [gallery, setGallery] = useState<GalleryResponse | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const g = await getGallery(galleryId);
        if (!cancelled) setGallery(g);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId]);
  return { gallery, failed, setGallery };
}

export function PersonalInfoTab({ gallery, onUpdated }: { gallery: GalleryResponse; onUpdated: (gallery: GalleryResponse) => void }) {
  const id = useId();
  const readOnly = gallery.stage === "ARCHIVED";
  const [title, setTitle] = useState(gallery.title);
  const [deadline, setDeadline] = useState(toDateInput(gallery.selectionDeadline));
  const [count, setCount] = useState(gallery.maxSelectablePhotoCount === null ? "" : String(gallery.maxSelectablePhotoCount));
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const countNumber = count.trim() === "" ? null : Number(count);
  const countValid = countNumber === null || (Number.isInteger(countNumber) && countNumber >= 1);
  const dirty =
    title.trim() !== gallery.title ||
    deadline !== toDateInput(gallery.selectionDeadline) ||
    countNumber !== gallery.maxSelectablePhotoCount;
  const valid = title.trim().length > 0 && countValid;
  const planLabel = `사진 ${gallery.planMaxPhotoCount !== null ? `${gallery.planMaxPhotoCount}장까지` : "제한 없음"} · ${deadlineDateLabel(gallery.planExpiresAt) ?? "기간 없음"}까지`;

  function reset() {
    setTitle(gallery.title);
    setDeadline(toDateInput(gallery.selectionDeadline));
    setCount(gallery.maxSelectablePhotoCount === null ? "" : String(gallery.maxSelectablePhotoCount));
  }

  async function save() {
    if (!dirty || !valid || saving) return;
    setSaving(true);
    setBanner(null);
    try {
      const updated = await updatePersonalGallery(gallery.id, {
        title: title.trim(),
        selectionDeadline: deadline ? toSelectionDeadline(deadline) : null,
        maxSelectablePhotoCount: countNumber,
      });
      onUpdated(updated);
      setSaved(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      if (err instanceof ApiError && err.code === "GALLERY_400_INVALID_SELECTION_DEADLINE") setBanner("선택 마감은 이용 기간보다 뒤로 정할 수 없어요.");
      else setBanner(err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="갤러리 정보">
      <div className="mb-5">
        <FieldLabel htmlFor={`${id}-title`}>이름</FieldLabel>
        {readOnly ? <ReadOnlyBox>{gallery.title}</ReadOnlyBox> : <TextField id={`${id}-title`} value={title} onChange={setTitle} error={title.trim().length === 0} className="h-12 px-4" />}
      </div>
      <div className="mb-5">
        <FieldLabel htmlFor={`${id}-deadline`} optional>
          선택 마감
        </FieldLabel>
        {readOnly ? (
          <ReadOnlyBox>{deadlineDateLabel(gallery.selectionDeadline) ?? "없음"}</ReadOnlyBox>
        ) : (
          <>
            <TextField id={`${id}-deadline`} type="date" value={deadline} onChange={setDeadline} className="h-12 px-4" />
            {gallery.planExpiresAt && <p className="mt-1.5 type-content-xs text-contents-light-bgd-weakness">이용 기간({deadlineDateLabel(gallery.planExpiresAt)})보다 뒤로는 정할 수 없어요</p>}
          </>
        )}
      </div>
      <div className="mb-5">
        <FieldLabel htmlFor={`${id}-count`} optional>
          고를 장수
        </FieldLabel>
        {readOnly ? (
          <ReadOnlyBox>{gallery.maxSelectablePhotoCount === null ? "정하지 않음" : `${gallery.maxSelectablePhotoCount}장`}</ReadOnlyBox>
        ) : (
          <>
            <TextField id={`${id}-count`} type="number" min={1} value={count} onChange={setCount} placeholder="비우면 몇 장이든" error={!countValid} className="h-12 px-4" />
            <p className="mt-1.5 type-content-xs text-contents-light-bgd-weakness">정하면 그 수를 정확히 채워야 요청서를 내보낼 수 있어요</p>
          </>
        )}
      </div>
      <div className="mb-6">
        <FieldLabel>플랜</FieldLabel>
        <ReadOnlyBox>{planLabel}</ReadOnlyBox>
      </div>
      {banner && (
        <p role="alert" className="mb-4 type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      {!readOnly && (
        <div className="flex items-center justify-end gap-2">
          {saved && <span className="mr-auto type-content-xs text-brand-secondary-dark">저장했어요</span>}
          <Button kind="ghost" disabled={!dirty || saving} onClick={reset}>
            되돌리기
          </Button>
          <Button disabled={!dirty || !valid || saving} onClick={() => void save()}>
            {saving ? "저장하는 중…" : "저장"}
          </Button>
        </div>
      )}
    </Section>
  );
}

export function PersonalPartnerTab({ galleryId }: { galleryId: number }) {
  return (
    <Section title="파트너">
      <PartnerInviteBody galleryId={galleryId} canManage />
    </Section>
  );
}

export function PersonalDangerTab({ gallery }: { gallery: GalleryResponse }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function remove() {
    await moveGalleryToTrash(gallery.id);
    await refreshMe();
    router.replace("/workspace");
  }

  return (
    <Section title="갤러리 삭제">
      <DangerCard
        title={`${gallery.title} 삭제`}
        desc="사진 · 폴더 · 셀렉 · 보정본이 휴지통으로 가요. 파트너에게 알림이 가요."
        action={<DangerButton onClick={() => setOpen(true)}>갤러리 삭제</DangerButton>}
      />
      {open && (
        <DangerConfirmModal
          title="갤러리를 삭제할까요?"
          confirmLabel="삭제"
          busyLabel="삭제하는 중…"
          requireText={gallery.title}
          onConfirm={remove}
          onClose={() => setOpen(false)}
        >
          <span className="font-medium text-contents-light-bgd-default">{gallery.title}</span>의 사진 · 폴더 · 셀렉 · 보정본이 휴지통으로 가요.
          확인을 위해 갤러리 이름을 입력해 주세요.
        </DangerConfirmModal>
      )}
    </Section>
  );
}

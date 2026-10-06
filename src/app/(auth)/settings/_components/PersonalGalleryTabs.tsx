"use client";

/**
 * 설정 › 개인 갤러리 — 정보(이름 · 목표일 · 고를 장수 · 플랜) · 파트너 · 갤러리 삭제 (묶음 D, 2026-09-23)
 * 위치: src/app/(auth)/settings/_components/PersonalGalleryTabs.tsx
 *
 * 스튜디오 설정과 같은 틀. 소유자: 정보 · 플랜 · 파트너 · 갤러리 삭제 / 파트너: 정보(읽기) · 플랜 · 갤러리 나가기 (이슈 75, 2026-09-23).
 * 저장은 PATCH galleries/{id}/personal — 서버가 소유자만 허용해 파트너는 읽기 전용(파트너도 수정 = 백엔드 전달 사항),
 * 목표일(서버 필드 selectionDeadline — 개인 갤러리에서는 "선택 마감" 대신 이 이름, QA BUG-1)은 플랜 만료 전까지, 보관(ARCHIVED)된 갤러리는 읽기만. 플랜(사진 상한 · 이용 기간)은 바꿀 수 없어 따로 읽기 탭.
 * 삭제는 휴지통 이동(DELETE galleries/{id}) — 복원 UI 없음, 보관 기간 뒤 자동 삭제(작가와 같음). 나가기는 DELETE members/me.
 */

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deadlineDateLabel } from "@/app/(studio)/_lib/galleryStatus";
import { PartnerInviteBody } from "@/app/(client)/gallery/[galleryId]/_shell/PartnerInviteBody";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import { getGallery, leaveGallery, moveGalleryToTrash, toSelectionDeadline, updatePersonalGallery, type GalleryResponse } from "@/lib/api/galleries";
import { destinationAfterLeaving } from "@/lib/auth/refreshMe";
import {
  GOAL_DATE_PROBLEM_MESSAGE,
  goalDateProblem,
  goalDateRange,
  goalDateRejectedMessage,
} from "@/lib/goalDateRange";
import { clampSelectableCountInput } from "@/lib/selectableCount";
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

export function PersonalInfoTab({
  gallery,
  canEdit,
  onUpdated,
}: {
  gallery: GalleryResponse;
  /** 소유자 — 파트너는 서버가 저장을 막아 읽기만(백엔드 전달 사항) */
  canEdit: boolean;
  onUpdated: (gallery: GalleryResponse) => void;
}) {
  const id = useId();
  const readOnly = !canEdit || gallery.stage === "ARCHIVED";
  const [title, setTitle] = useState(gallery.title);
  const [deadline, setDeadline] = useState(toDateInput(gallery.selectionDeadline));
  /** 날짜 칸에 뭔가 적혀 있는데 날짜로 읽히지 않는 상태 — 값은 빈 문자열이라 따로 받는다 */
  const [deadlineUnreadable, setDeadlineUnreadable] = useState(false);
  const [now] = useState(() => Date.now());
  const [count, setCount] = useState(gallery.maxSelectablePhotoCount === null ? "" : String(gallery.maxSelectablePhotoCount));
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // 장수 칸은 적을 때 1~200으로 맞춰진다. 상한이 생기기 전에 저장된 더 큰 값은 건드리기 전까지 그대로 둔다
  const countNumber = count.trim() === "" ? null : Number(count);
  const countValid = countNumber === null || (Number.isInteger(countNumber) && countNumber >= 1);
  const deadlineChanged = deadline !== toDateInput(gallery.selectionDeadline);
  const dirty =
    title.trim() !== gallery.title ||
    deadlineChanged ||
    countNumber !== gallery.maxSelectablePhotoCount;
  // 목표일은 오늘부터 이용 기간 안에서만. 저장돼 있던 값은 범위 밖일 수 있어(지난 목표일) 손대기 전에는 문제 삼지 않는다
  const goalRange = goalDateRange(gallery.planExpiresAt, now);
  const deadlineProblem = deadlineChanged || deadlineUnreadable ? goalDateProblem(deadline, goalRange, deadlineUnreadable) : null;
  const valid = title.trim().length > 0 && countValid && deadlineProblem === null;

  function reset() {
    setTitle(gallery.title);
    setDeadline(toDateInput(gallery.selectionDeadline));
    setDeadlineUnreadable(false);
    setCount(gallery.maxSelectablePhotoCount === null ? "" : String(gallery.maxSelectablePhotoCount));
  }

  async function save() {
    if (!dirty || !valid || saving) return;
    setSaving(true);
    setBanner(null);
    try {
      const updated = await updatePersonalGallery(gallery.id, {
        title: title.trim(),
        // 목표일을 건드리지 않았으면 받은 값을 그대로 돌려보낸다 — 서버가 넣어 둔 값(이용 기간 만료 시각)을 날짜로 다시 만들어
        // 다른 시각으로 바꿔 보내지 않게. 지난 목표일은 서버가 아직 바뀌지 않은 값에도 지난 날짜 검사를 해서 거절한다(서버 이슈로 전달)
        selectionDeadline: deadlineChanged ? (deadline ? toSelectionDeadline(deadline) : null) : gallery.selectionDeadline,
        maxSelectablePhotoCount: countNumber,
      });
      onUpdated(updated);
      setSaved(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setBanner(err instanceof ApiError ? (goalDateRejectedMessage(err.code) ?? err.message) : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
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
          목표일
        </FieldLabel>
        {readOnly ? (
          <ReadOnlyBox>{deadlineDateLabel(gallery.selectionDeadline) ?? "없음"}</ReadOnlyBox>
        ) : (
          <>
            <TextField
              id={`${id}-deadline`}
              type="date"
              value={deadline}
              onChange={setDeadline}
              onBadInput={setDeadlineUnreadable}
              min={goalRange.min}
              max={goalRange.max ?? undefined}
              error={deadlineProblem !== null}
              className="h-12 px-4"
            />
            {deadlineProblem ? (
              <p className="mt-1.5 type-content-xs text-function-error-default">{GOAL_DATE_PROBLEM_MESSAGE[deadlineProblem]}</p>
            ) : (
              gallery.planExpiresAt && <p className="mt-1.5 type-content-xs text-contents-light-bgd-weakness">이용 기간({deadlineDateLabel(gallery.planExpiresAt)})보다 뒤로는 정할 수 없어요</p>
            )}
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
            <TextField id={`${id}-count`} inputMode="numeric" value={count} onChange={(v) => setCount(clampSelectableCountInput(v))} placeholder="예: 50" autoComplete="off" error={!countValid} className="h-12 px-4" />
            <p className="mt-1.5 type-content-xs text-contents-light-bgd-weakness">정하면 그 수를 정확히 채워야 요청서를 내보낼 수 있어요</p>
          </>
        )}
      </div>
      {readOnly && canEdit === false && gallery.stage !== "ARCHIVED" && (
        <p className="mb-6 type-content-xs text-contents-light-bgd-weakness">바꾸는 건 소유자만 할 수 있어요</p>
      )}
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

/** 플랜 — 바꿀 수 없는 값(사진 상한 · 이용 기간 · 남은 일수). 소유자 · 파트너 모두 읽기 */
export function PersonalPlanTab({ gallery }: { gallery: GalleryResponse }) {
  const [now] = useState(() => Date.now());
  const days = gallery.planExpiresAt ? Math.ceil((new Date(gallery.planExpiresAt).getTime() - now) / 86_400_000) : null;
  return (
    <Section title="플랜">
      <div className="mb-5">
        <FieldLabel>사진</FieldLabel>
        <ReadOnlyBox>{gallery.planMaxPhotoCount !== null ? `${gallery.planMaxPhotoCount}장까지` : "제한 없음"}</ReadOnlyBox>
      </div>
      <div className="mb-5">
        <FieldLabel>이용 기간</FieldLabel>
        <ReadOnlyBox>
          {gallery.planExpiresAt ? `${deadlineDateLabel(gallery.planExpiresAt)}까지${days !== null ? (days > 0 ? ` · ${days}일 남음` : " · 끝남") : ""}` : "기간 없음"}
        </ReadOnlyBox>
      </div>
      <p className="type-content-xs text-contents-light-bgd-weakness">플랜은 바꿀 수 없어요 · 기간이 끝나면 갤러리가 보관돼요</p>
    </Section>
  );
}

/** 파트너 — 갤러리 나가기(DELETE members/me). 다시 들어오려면 소유자의 초대 링크 */
export function PersonalLeaveTab({ gallery }: { gallery: GalleryResponse }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function leave() {
    await leaveGallery(gallery.id);
    router.replace(await destinationAfterLeaving());
  }
  return (
    <Section title="갤러리 나가기">
      <DangerCard
        title={`${gallery.title} 나가기`}
        desc="나가면 이 갤러리를 볼 수 없어요. 다시 들어오려면 초대 링크가 필요해요."
        action={<DangerButton onClick={() => setOpen(true)}>나가기</DangerButton>}
      />
      {open && (
        <DangerConfirmModal title="갤러리를 나갈까요?" confirmLabel="나가기" busyLabel="나가는 중…" onConfirm={leave} onClose={() => setOpen(false)}>
          <span className="font-medium text-contents-light-bgd-default">{gallery.title}</span>을 더 볼 수 없어요. 다시 들어오려면 초대 링크가 필요해요.
        </DangerConfirmModal>
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
    router.replace(await destinationAfterLeaving());
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

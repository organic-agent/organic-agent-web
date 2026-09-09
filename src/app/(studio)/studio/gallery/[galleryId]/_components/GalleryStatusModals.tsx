"use client";

/**
 * 작가 — 갤러리 상태 전환 다이얼로그 3종 (열기 / 선택 마감 / 재오픈)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_components/GalleryStatusModals.tsx
 *
 * 전환은 결과를 설명한 뒤 실행한다 — 열면 부부에게 보이고, 마감하면 고르기가
 * 멈추고, 재오픈은 마감 기한을 다시 받는다(지난 기한을 그대로 두면 열자마자
 * 다시 막히기 때문). 400(상태 불일치)·403은 서버 메시지를 배너로 보여주고
 * 입력을 유지한다.
 */

import { useState } from "react";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "@/app/(studio)/studio/_components/GalleryModalShell";
import { isPastDueDate } from "@/app/(studio)/_lib/galleryForm";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import {
  type GalleryResponse,
  closeGallery,
  openGallery,
  reopenGallery,
  toSelectionDeadline,
} from "@/lib/api/galleries";

type TransitionProps = {
  gallery: GalleryResponse;
  onClose: () => void;
  /** 전환 성공 응답 — 호출부가 화면 상태를 재조회 없이 갱신한다. */
  onDone: (gallery: GalleryResponse) => void;
};

function errorMessage(err: unknown): string {
  return err instanceof ApiError
    ? err.message
    : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
      {message}
    </p>
  );
}

export function OpenGalleryConfirmModal({
  gallery,
  onClose,
  onDone,
}: TransitionProps) {
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  async function confirmOpen() {
    if (submitting) return;
    setSubmitting(true);
    setBanner(null);
    try {
      onDone(await openGallery(gallery.id));
    } catch (err) {
      setBanner(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <GalleryModalShell
      title="갤러리를 열까요?"
      maxWidthClassName="max-w-[380px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      <p className="mb-6 type-content-m text-contents-light-bgd-sub">
        열면 초대된 부부에게{" "}
        <span className="font-medium text-contents-light-bgd-default">{gallery.title}</span>이
        보이기 시작해요. 사진은 연 뒤에도 계속 올릴 수 있어요.
      </p>
      <ErrorBanner message={banner} />
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={confirmOpen}
        confirmLabel={submitting ? "여는 중…" : "갤러리 열기"}
        disabled={submitting}
      />
    </GalleryModalShell>
  );
}

export function CloseGalleryConfirmModal({
  gallery,
  onClose,
  onDone,
}: TransitionProps) {
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  async function confirmClose() {
    if (submitting) return;
    setSubmitting(true);
    setBanner(null);
    try {
      onDone(await closeGallery(gallery.id));
    } catch (err) {
      setBanner(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <GalleryModalShell
      title="선택을 마감할까요?"
      maxWidthClassName="max-w-[380px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      <p className="mb-6 type-content-m text-contents-light-bgd-sub">
        마감하면 부부는{" "}
        <span className="font-medium text-contents-light-bgd-default">{gallery.title}</span>의
        사진을 계속 볼 수 있지만, 고르거나 묶는 건 멈춰요. 필요하면 언제든
        다시 열 수 있어요.
      </p>
      <ErrorBanner message={banner} />
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={confirmClose}
        confirmLabel={submitting ? "마감 중…" : "선택 마감"}
        disabled={submitting}
      />
    </GalleryModalShell>
  );
}

export function ReopenGalleryModal({
  gallery,
  onClose,
  onDone,
}: TransitionProps) {
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const pastDue = isPastDueDate(dueDate);

  async function confirmReopen() {
    if (submitting || pastDue) return;
    setSubmitting(true);
    setBanner(null);
    try {
      onDone(
        await reopenGallery(
          gallery.id,
          dueDate ? toSelectionDeadline(dueDate) : null,
        ),
      );
    } catch (err) {
      setBanner(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <GalleryModalShell
      title="갤러리를 다시 열까요?"
      desc="마감 기한을 새로 정할 수 있어요. 부부는 다시 사진을 고를 수 있게 돼요."
      maxWidthClassName="max-w-[380px]"
      paddingClassName="p-7"
      onClose={onClose}
    >
      <div className="mb-6">
        <label className="mb-1.5 block type-label-medium-m text-contents-light-bgd-default">
          선택 마감 기한
          <span className="ml-1 font-normal text-contents-light-bgd-sub">(선택)</span>
        </label>
        <TextField
          type="date"
          value={dueDate}
          onChange={setDueDate}
          error={pastDue}
          aria-label="선택 마감 기한"
          className="h-10"
        />
        <p
          className={`mt-1.5 type-content-xs ${
            pastDue ? "text-function-error-default" : "text-contents-light-bgd-sub"
          }`}
        >
          {pastDue
            ? "이미 지난 날짜예요. 마감 기한을 다시 확인해 주세요."
            : "비워두면 기한 없이 열려요."}
        </p>
      </div>
      <ErrorBanner message={banner} />
      <GalleryModalButtons
        onClose={onClose}
        onConfirm={confirmReopen}
        confirmLabel={submitting ? "여는 중…" : "재오픈"}
        disabled={submitting || pastDue}
      />
    </GalleryModalShell>
  );
}

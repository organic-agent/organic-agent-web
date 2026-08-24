"use client";

/**
 * 앨범으로 저장 모달 — 피그마 Modal/SaveAlbum 대응 (이슈 #31)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/SaveAlbumModal.tsx
 *
 * 지금 보이는 묶음을 그대로 얼려 앨범(부모폴더)+폴더(자식)로 저장한다.
 * 낱장들은 "나머지 사진" 폴더로 함께 담아 빠지는 사진이 없게 한다(시안 확정).
 * 409(같은 앨범 안 사진 중복)·400(상한·이름)은 서버 메시지를 배너로 보여주고
 * 입력을 유지한다 — 상태 전환 모달과 같은 문법.
 */

import { useState } from "react";
import {
  GalleryModalButtons,
  GalleryModalShell,
} from "@/app/(photographer)/galleries/_components/GalleryModalShell";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import {
  type FolderRequest,
  type PhotoFolderGroupResponse,
  createFolderGroup,
} from "@/lib/api/folders";
import type { GalleryPhoto } from "@/lib/galleryPhotos";

/** 기본 이름 — "M월 D일 자동 분류", 같은 이름이 이미 있으면 뒤에 2, 3… */
export function defaultAlbumName(
  existingNames: string[],
  now = new Date(),
): string {
  const base = `${now.getMonth() + 1}월 ${now.getDate()}일 자동 분류`;
  if (!existingNames.includes(base)) return base;
  let n = 2;
  while (existingNames.includes(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

type SaveAlbumModalProps = {
  galleryId: number;
  /** 2장 이상 묶음 — 폴더 1..n으로 저장 */
  groups: GalleryPhoto[][];
  /** 낱장 — "나머지 사진" 폴더로 저장 */
  singles: GalleryPhoto[];
  /** 기존 앨범 이름들 — 기본 이름 중복 회피용 */
  existingNames: string[];
  onClose: () => void;
  onSaved: (group: PhotoFolderGroupResponse) => void;
};

export function SaveAlbumModal({
  galleryId,
  groups,
  singles,
  existingNames,
  onClose,
  onSaved,
}: SaveAlbumModalProps) {
  const [name, setName] = useState(() => defaultAlbumName(existingNames));
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const total = groups.reduce((sum, g) => sum + g.length, 0) + singles.length;

  async function save() {
    if (submitting) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const folders: FolderRequest[] = groups.map((group, i) => ({
        name: `폴더 ${i + 1}`,
        photoIds: group.map((p) => p.id),
      }));
      if (singles.length > 0) {
        folders.push({
          name: "나머지 사진",
          photoIds: singles.map((p) => p.id),
        });
      }
      const created = await createFolderGroup(galleryId, {
        name: name.trim() || defaultAlbumName(existingNames),
        folders,
      });
      onSaved(created);
    } catch (err) {
      setBanner(
        err instanceof ApiError
          ? err.message
          : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
      setSubmitting(false);
    }
  }

  return (
    <GalleryModalShell
      title="앨범으로 저장"
      desc={`폴더 ${groups.length}개 · 나머지 사진 ${singles.length}장 — 모두 ${total}장을 앨범에 저장해요`}
      onClose={onClose}
    >
      {banner && (
        <p
          role="alert"
          className="mb-4 text-center type-body-small text-fg-critical"
        >
          {banner}
        </p>
      )}
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="type-body-small text-fg-neutral">앨범 이름</span>
          <TextField
            value={name}
            onChange={setName}
            placeholder={defaultAlbumName(existingNames)}
            aria-label="앨범 이름"
          />
        </label>
        <p className="rounded-(--radius-8) bg-bg-layer-default-hover px-4 py-3 type-body-small text-fg-neutral-muted">
          지금 구성 그대로 앨범에 담겨요. 폴더 이름은 저장 후 바꿀 수 있고,
          저장 후 유사성 단계를 바꿔도 이 앨범은 변하지 않아요.
        </p>
        <GalleryModalButtons
          onClose={onClose}
          onConfirm={save}
          confirmLabel={submitting ? "저장 중…" : "저장"}
          disabled={submitting || total === 0}
        />
      </div>
    </GalleryModalShell>
  );
}

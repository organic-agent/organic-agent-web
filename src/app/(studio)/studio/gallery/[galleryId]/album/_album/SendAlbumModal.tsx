"use client";

/**
 * 앨범 보내고 확정 창(이슈 168 PR ④) — 보내는 순간 확정돼 그 뒤로는 스튜디오도 고칠 수 없다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/SendAlbumModal.tsx
 *
 * 클라이언트 수정을 잠가(결정 4) 보내는 방식(보기만 · 수정 가능)을 고르는 칸이 없다 — 서버에는 보기만(view)으로 보낸다(결정 3-2).
 * 보내면 클라이언트에게 알림이 가고 갤러리는 작업 완료로 넘어간다.
 */

import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";

export function SendAlbumModal({ summary, sending, onClose, onSend }: { summary: string; sending: boolean; onClose: () => void; onSend: () => void }) {
  return (
    <GalleryModalShell title="앨범을 보내고 확정할까요?" desc={`${summary} · 보낸 뒤에는 고칠 수 없어요`} maxWidthClassName="max-w-130" onClose={onClose}>
      <GalleryModalButtons onClose={onClose} confirmLabel="보내고 확정" onConfirm={onSend} disabled={sending} />
    </GalleryModalShell>
  );
}

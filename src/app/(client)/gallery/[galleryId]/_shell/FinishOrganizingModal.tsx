"use client";

/**
 * 정리 끝내기 확인 모달(개인 갤러리) — 셀렉 중 "폴더 다시 정리"에서 셀렉으로 돌아갈 때 한 번 묻는다 (이슈 147)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/FinishOrganizingModal.tsx
 *
 * 폴더는 이미 확정된 채라 서버 호출은 없다 — 정리 모드만 닫는다. 상단 단계 칩 "셀렉 & 보정 작성"과 하단 "정리 끝내기"가 같이 연다.
 */

import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";

export function FinishOrganizingModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <GalleryModalShell title="이대로 폴더를 확정할까요?" desc="확정하면 셀렉으로 돌아가요 · 폴더는 언제든 다시 정리할 수 있어요" maxWidthClassName="max-w-105" onClose={onClose}>
      <GalleryModalButtons onClose={onClose} onConfirm={onConfirm} confirmLabel="폴더 확정" />
    </GalleryModalShell>
  );
}

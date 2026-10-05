/**
 * 작가 — 갤러리 생성 알림 (공용 스낵바)
 * 위치: src/app/(studio)/studio/_components/GalleryCreatedToast.tsx
 *
 * 새 갤러리 생성 후 목록 화면 하단에 짧은 완료 알림을 보여준다.
 */

import { Snackbar } from "@/components/app/Snackbar";

type Props = {
  galleryName: string | null;
};

export function GalleryCreatedToast({ galleryName }: Props) {
  if (!galleryName) return null;

  return (
    <Snackbar kind="success" className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2">
      ‘{galleryName}’ 갤러리를 만들었어요
    </Snackbar>
  );
}

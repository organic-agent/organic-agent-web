/**
 * 작가 — 필터 결과 없음 안내
 * 위치: src/app/(studio)/studio/_components/GalleryEmptyState.tsx
 *
 * 고른 단계에 갤러리가 없을 때 보여준다. 갤러리가 아예 없는 첫 화면은 빈 상태 카드 대신
 * 새 갤러리 타일 + 이용권 배너가 맡는다(GalleryGrid · 홈 페이지).
 */

import { Button } from "@/components/ui/Button";

export function GalleryEmptyState({
  label,
  onShowAll,
}: {
  /** 현재 필터 이름 — "보관됨 갤러리가 없어요" */
  label: string;
  onShowAll: () => void;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-(--radius-16) border border-dashed border-divider-default px-6 text-center">
      <h2 className="mb-2 type-title-m text-contents-light-bgd-default">
        {label} 갤러리가 없어요
      </h2>
      <p className="mb-5 type-content-m text-contents-light-bgd-sub">
        다른 단계를 고르거나 전체 목록을 확인해 보세요.
      </p>
      <Button kind="ghost" onClick={onShowAll}>
        전체 보기
      </Button>
    </div>
  );
}

/**
 * 작가 — 갤러리 목록 로딩·오류 상태 (피그마 Photographer/CardSkeleton·ListError 대응)
 * 위치: src/app/(photographer)/galleries/_components/GalleryListStates.tsx
 *
 * 서버 조회 중에는 카드와 같은 골격의 스켈레톤 3장을, 실패하면 재시도
 * 동선을 보여준다. 스켈레톤은 정적 회색(shimmer 없음)으로 담백하게.
 */

import { Button } from "@/components/ui/Button";

export function GalleryListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="갤러리 목록 불러오는 중"
      className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-(--radius-16) border border-divider-default bg-background-default-main"
        >
          <div className="aspect-12/7 bg-surface-default-light" />
          <div className="flex flex-col gap-2.5 p-3 pb-5">
            <div className="h-3 w-[70%] rounded-(--radius-4) bg-surface-default-light" />
            <div className="h-3 w-[45%] rounded-(--radius-4) bg-surface-default-light" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GalleryListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-(--radius-16) border border-dashed border-border-default px-6 py-14 text-center">
      <p className="type-title-m text-contents-light-bgd-default">
        갤러리 목록을 불러오지 못했어요
      </p>
      <p className="mb-2 type-content-xs text-contents-light-bgd-sub">
        네트워크 연결을 확인한 뒤 다시 시도해 주세요
      </p>
      <Button size="sm" onClick={onRetry}>
        다시 불러오기
      </Button>
    </div>
  );
}

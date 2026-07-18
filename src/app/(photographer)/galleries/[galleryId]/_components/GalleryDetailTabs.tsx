/**
 * 작가 — 갤러리 상세 탭
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryDetailTabs.tsx
 *
 * 갤러리 상세 화면의 사진/최종 선택본/셀렉 현황 탭 버튼을 보여준다.
 * 현재 선택된 탭과 탭 변경 콜백을 props로 받는다.
 *
 * 주요 책임:
 * - 상세 탭 목록 정의
 * - 활성 탭 스타일 표시
 * - 탭 변경 이벤트 전달
 */

export type GalleryDetailTab = "photos" | "final" | "status";

const TABS: { key: GalleryDetailTab; label: string }[] = [
  { key: "photos", label: "사진" },
  { key: "final", label: "최종 선택본" },
  { key: "status", label: "셀렉 현황" },
];

type Props = {
  tab: GalleryDetailTab;
  onTabChange: (tab: GalleryDetailTab) => void;
};

export function GalleryDetailTabs({ tab, onTabChange }: Props) {
  return (
    <div className="px-6 md:px-8 flex gap-6">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          className={`relative h-11 text-[14px] transition-colors ${
            tab === t.key ? "text-ink font-medium" : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {t.label}
          {tab === t.key && (
            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-ink rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * 부부 — 사진 필터 칩
 * 위치: src/app/(couple)/gallery/[folderKey]/_components/PhotoFilterChips.tsx
 *
 * 폴더 상세 상단에서 전체/선택앨범/후보/고민중/제외/미정 필터를 표시한다.
 */

export type PhotoFilter =
  | "all"
  | "selected"
  | "good"
  | "hold"
  | "remove"
  | "undecided";

export const PHOTO_FILTERS: { key: PhotoFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "selected", label: "선택앨범" },
  { key: "good", label: "후보" },
  { key: "hold", label: "고민중" },
  { key: "remove", label: "제외" },
  { key: "undecided", label: "미정" },
];

type Props = {
  activeFilter: PhotoFilter;
  counts: Record<PhotoFilter, number>;
  onChange: (filter: PhotoFilter) => void;
};

export function PhotoFilterChips({ activeFilter, counts, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5 ml-4">
      {PHOTO_FILTERS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`h-8 px-3 rounded-pill text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5 ${
            activeFilter === item.key
              ? "bg-ink text-on-ink"
              : "border border-line text-ink-2 hover:border-ink-3"
          }`}
        >
          <span>{item.label}</span>
          <span
            className={`font-mono text-[11px] ${
              activeFilter === item.key ? "text-white/70" : "text-ink-3"
            }`}
          >
            {counts[item.key]}
          </span>
        </button>
      ))}
    </div>
  );
}

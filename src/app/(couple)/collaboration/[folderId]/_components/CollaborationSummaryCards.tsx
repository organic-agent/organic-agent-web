type Props = {
  photoCount: number;
  commentCount: number;
  reactionCount: number;
};

const SUMMARY_ITEMS = [
  { key: "photos", label: "사진", unit: "장" },
  { key: "comments", label: "의견", unit: "개" },
  { key: "reactions", label: "반응", unit: "개" },
] as const;

export function CollaborationSummaryCards({
  photoCount,
  commentCount,
  reactionCount,
}: Props) {
  const values = {
    photos: photoCount,
    comments: commentCount,
    reactions: reactionCount,
  };

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {SUMMARY_ITEMS.map((item) => (
        <div key={item.key} className="rounded-lg border border-line bg-white p-4">
          <p className="text-[12px] font-medium text-ink-3">{item.label}</p>
          <p className="mt-2 font-display-en text-[30px] font-semibold leading-none text-ink">
            {values[item.key]}
            <span className="ml-1 text-[13px] font-medium text-ink-3">
              {item.unit}
            </span>
          </p>
        </div>
      ))}
    </section>
  );
}

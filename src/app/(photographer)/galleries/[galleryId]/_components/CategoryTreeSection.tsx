import { MenuItem } from "@/components/ui/MenuItem";
import { PhotoIcon } from "@/components/icons";
import type { CategoryOverviewResult } from "../_lib/useCategoryOverview";

type Props = {
  result: CategoryOverviewResult | null;
  activeDetailFolderId: number | null;
  onSelectDetailFolder: (detailFolderId: number) => void;
  onSelectUnclassified: () => void;
};

export function CategoryTreeSection({
  result,
  activeDetailFolderId,
  onSelectDetailFolder,
  onSelectUnclassified,
}: Props) {
  if (result === null) {
    return <p className="px-3 py-2 type-body-small text-fg-neutral-muted">카테고리를 불러오는 중이에요.</p>;
  }
  if (result.kind === "error") {
    return <p className="px-3 py-2 type-body-small text-fg-critical">카테고리를 불러오지 못했어요.</p>;
  }

  const unclassifiedCount =
    result.latestJob?.photos.filter((photo) => photo.status === "UNCLASSIFIED" || photo.status === "FAILED").length ?? 0;

  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 pb-1 type-label-caption text-fg-neutral-muted">카테고리</p>
      {result.folders.flatMap((concept) =>
        concept.details.map((detail) => (
          <MenuItem
            key={detail.id}
            icon={<PhotoIcon size={20} />}
            label={`${concept.name} / ${detail.name}`}
            count={detail.photoIds.length}
            selected={activeDetailFolderId === detail.id}
            onClick={() => onSelectDetailFolder(detail.id)}
          />
        )),
      )}
      <MenuItem
        icon={<PhotoIcon size={20} />}
        label="미분류 사진"
        count={unclassifiedCount}
        selected={activeDetailFolderId === 0}
        onClick={onSelectUnclassified}
      />
    </div>
  );
}

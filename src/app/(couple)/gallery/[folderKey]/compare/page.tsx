import { ComparisonWorkspace } from "./_components/ComparisonWorkspace";

type Props = {
  params: Promise<{ folderKey: string }>;
  searchParams: Promise<{
    left?: string | string[];
    right?: string | string[];
    filter?: string | string[];
  }>;
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { folderKey } = await params;
  const query = await searchParams;
  let decodedFolderKey = folderKey;
  try {
    decodedFolderKey = decodeURIComponent(folderKey);
  } catch {}

  return (
    <ComparisonWorkspace
      folderKey={decodedFolderKey}
      initialLeftPhotoId={Number(first(query.left))}
      initialRightPhotoId={Number(first(query.right))}
      initialFilter={first(query.filter) ?? "all"}
    />
  );
}

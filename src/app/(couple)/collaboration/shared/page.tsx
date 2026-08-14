import { SharedCollaborationFolders } from "./_components/SharedCollaborationFolders";

type Props = {
  searchParams: Promise<{ folders?: string | string[] }>;
};

export default async function SharedCollaborationPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawFolderIds = Array.isArray(params.folders)
    ? params.folders[0]
    : params.folders;
  const folderIds = (rawFolderIds ?? "")
    .split(",")
    .map((folderId) => folderId.trim())
    .filter(Boolean);

  return <SharedCollaborationFolders folderIds={folderIds} />;
}

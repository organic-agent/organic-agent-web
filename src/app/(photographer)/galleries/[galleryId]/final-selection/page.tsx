import { GalleryFinalSelectionTab } from "../_components/GalleryFinalSelectionTab";
import { GalleryWorkspaceContentShell } from "../_components/GalleryWorkspaceContentShell";

export default async function GalleryFinalSelectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ galleryId: string }>;
  searchParams: Promise<{ workStatus?: string | string[] }>;
}) {
  const { galleryId } = await params;
  const { workStatus } = await searchParams;

  return (
    <GalleryWorkspaceContentShell>
      <GalleryFinalSelectionTab
        galleryId={galleryId}
        showIncompleteOnly={workStatus === "incomplete"}
      />
    </GalleryWorkspaceContentShell>
  );
}

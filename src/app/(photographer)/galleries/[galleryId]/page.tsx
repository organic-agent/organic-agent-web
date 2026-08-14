"use client";

import { useParams } from "next/navigation";
import { useGalleries } from "@/lib/galleries";
import { GalleryPhotosTab } from "./_components/GalleryPhotosTab";
import { GalleryWorkspaceContentShell } from "./_components/GalleryWorkspaceContentShell";

export default function GalleryPhotosPage() {
  const { galleryId } = useParams<{ galleryId: string }>();
  const gallery = useGalleries().find((item) => item.id === galleryId);

  return (
    <GalleryWorkspaceContentShell>
      <GalleryPhotosTab total={gallery?.total ?? 842} />
    </GalleryWorkspaceContentShell>
  );
}

import { GalleryWorkspaceSidebar } from "./_components/GalleryWorkspaceSidebar";

export default async function GalleryWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ galleryId: string }>;
}) {
  const { galleryId } = await params;

  return (
    <div className="min-h-dvh bg-white flex">
      <GalleryWorkspaceSidebar galleryId={galleryId} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

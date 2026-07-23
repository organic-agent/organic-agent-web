"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { useGalleries } from "@/lib/galleries";
import { useStudioInfo } from "@/lib/studio";

type Props = {
  galleryId: string;
};

export function GalleryWorkspaceSidebar({ galleryId }: Props) {
  const pathname = usePathname();
  const galleries = useGalleries();
  const studio = useStudioInfo();
  const gallery = galleries.find((item) => item.id === galleryId);
  const galleryRoot = `/galleries/${galleryId}`;
  const photosActive =
    pathname === galleryRoot || pathname.startsWith(`${galleryRoot}/folders/`);

  const menu = [
    {
      key: "galleries",
      label: "스튜디오 목록으로",
      href: "/galleries",
      icon: "M19 12H5M12 19l-7-7 7-7",
    },
    {
      key: "photos",
      label: "사진",
      href: galleryRoot,
      icon: "M4 4h16v16H4zM4 12h16M12 4v16",
      active: photosActive,
    },
    {
      key: "final-selection",
      label: "최종 선택본",
      href: `${galleryRoot}/final-selection`,
      icon: "M5 3h14v18l-7-4-7 4z",
      active: pathname.startsWith(`${galleryRoot}/final-selection`),
    },
    {
      key: "selection-status",
      label: "셀렉 현황",
      href: `${galleryRoot}/selection-status`,
      icon: "M4 19V9M10 19V5M16 19v-7M22 19V3",
      active: pathname.startsWith(`${galleryRoot}/selection-status`),
    },
  ];

  return (
    <AppSidebar
      menu={menu}
      subtitle={{
        title: gallery?.couple ?? "갤러리",
        caption: gallery ? `선택 마감 ${gallery.dueDate}` : "갤러리 작업 공간",
      }}
      user={{
        initial: studio.name.trim().slice(0, 1) || "스",
        name: studio.name,
        role: "studio@email.com",
      }}
      homeHref="/galleries"
    />
  );
}

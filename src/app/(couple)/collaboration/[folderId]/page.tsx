"use client";

/**
 * 부부 — 협업 셀렉 폴더 상세
 * 위치: src/app/(couple)/collaboration/[folderId]/page.tsx
 *
 * 협업 폴더 안의 사진을 중심으로 가족·지인의 반응과 의견을 확인한다.
 * 사진을 선택하면 오른쪽 패널에서 해당 사진의 의견을 바로 볼 수 있다.
 */

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { useFolders } from "@/lib/couple";
import { CollaborationDetailHeader } from "./_components/CollaborationDetailHeader";
import { CollaborationPhotoGrid } from "./_components/CollaborationPhotoGrid";
import { CollaborationShareModal } from "../_components/CollaborationShareModal";

const SIDEBAR = [
  {
    key: "gallery",
    label: "카테고리 갤러리",
    href: "/gallery",
    icon: "M4 4h16v16H4zM4 12h16M12 4v16",
  },
  {
    key: "selected",
    label: "선택 앨범",
    href: "/selected",
    icon: "M5 3h14v18l-7-4-7 4z",
  },
  {
    key: "collaboration",
    label: "협업 셀렉",
    href: "/collaboration",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    active: true,
  },
];

const SHARE_CODE = "8391";
const SHARE_EXPIRES_IN = "7일 후 만료";

export default function CollaborationDetailPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const folders = useFolders();
  const folder = folders.find((f) => f.id === folderId);
  const [shareOpen, setShareOpen] = useState(false);

  if (!folder) {
    return (
      <div className="min-h-dvh bg-white grid place-items-center px-6">
        <div className="text-center">
          <p className="text-[14px] text-ink-2 mb-3">
            폴더를 찾을 수 없어요
          </p>
          <Link
            href="/collaboration"
            className="text-[13px] text-accent hover:text-accent-press underline underline-offset-2"
          >
            협업 셀렉 목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white flex">
      {/* ═══ 사이드바 (공용 컴포넌트) ═══ */}
      <AppSidebar
        menu={SIDEBAR}
        subtitle={{ title: "민준 & 서연", caption: "스튜디오 이름" }}
        user={{ initial: "서", name: "서연", role: "신부" }}
        homeHref="/gallery"
      />

      <main className="flex-1 min-w-0">
        <CollaborationDetailHeader
          folderName={folder.name}
          folderMemo={folder.memo}
          onShareClick={() => setShareOpen(true)}
        />

        <div className="px-6 md:px-8 py-8">
          <CollaborationPhotoGrid
            folderId={folder.id}
            photos={folder.photos}
          />
        </div>
      </main>

      {shareOpen && (
        <CollaborationShareModal
          folders={folders}
          initialSelectedFolderIds={[folder.id]}
          shareCode={SHARE_CODE}
          expiresIn={SHARE_EXPIRES_IN}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

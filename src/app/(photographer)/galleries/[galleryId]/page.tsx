"use client";

/**
 * 작가 — 갤러리 상세 페이지
 * 위치: src/app/(photographer)/galleries/[galleryId]/page.tsx
 *
 * 특정 갤러리 하나의 상세 화면을 조립한다.
 * URL의 galleryId로 갤러리를 찾고, 탭·모달·상태 변경 액션을 관리한다.
 *
 * 주요 책임:
 * - 갤러리 ID 읽기와 데이터 조회
 * - 사진/최종 선택본/셀렉 현황 탭 상태 관리
 * - 업로드·초대·전달 완료 액션 처리
 *
 * 참고:
 * - 사진/셀렉 상세 데이터는 아직 목업이며, 회의 후 API로 교체한다.
 */

import { useState } from "react";
import { useParams } from "next/navigation";
import { getGalleryBadge, updateGallery, useGalleries } from "@/lib/galleries";
import { GalleryDetailHeader } from "./_components/GalleryDetailHeader";
import {
  GalleryDetailTabs,
  type GalleryDetailTab,
} from "./_components/GalleryDetailTabs";
import { GalleryFinalSelectionTab } from "./_components/GalleryFinalSelectionTab";
import { GalleryInviteModal } from "./_components/GalleryInviteModal";
import { GalleryPhotosTab } from "./_components/GalleryPhotosTab";
import { GallerySelectionStatusTab } from "./_components/GallerySelectionStatusTab";
import { GalleryUploadModal } from "./_components/GalleryUploadModal";

/* ─── 목업 데이터 (회의 후 API로 교체) ─── */
const GALLERY = {
  couple: "민준 & 서연",
  date: "2026.05.17",
  total: 842,
  selected: 312,
  held: 45,
  invited: [
    { name: "신부 · 서연", status: "수락", role: "bride" },
    { name: "신랑 · 민준", status: "수락", role: "groom" },
    { name: "혼주 · 어머니", status: "대기", role: "family" },
  ],
};

export default function GalleryDetailPage() {
  const { galleryId } = useParams<{ galleryId: string }>();
  const galleries = useGalleries();
  const gallery = galleries.find((g) => g.id === galleryId);
  const badge = gallery ? getGalleryBadge(gallery) : null;

  const [tab, setTab] = useState<GalleryDetailTab>("photos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // 초대를 보내면 목록 페이지에서 이 갤러리가 '셀렉 진행 중'으로 보이도록 반영
  function sendInvite() {
    updateGallery(galleryId, { invited: true });
    setInviteOpen(false);
  }

  // 실제 업로드는 아니지만, 이 모달을 확인하면 진짜로 uploaded=true가 되고
  // 목업 장수가 채워져서 "업로드 전 → 초대 전" 단계가 실제로 넘어간다.
  function confirmUpload() {
    updateGallery(galleryId, {
      uploaded: true,
      total: gallery && gallery.total > 0 ? gallery.total : 620,
    });
    setUploadOpen(false);
  }

  // 부부가 제출을 마친 뒤(셀렉 완료), 작가가 보정본 전달까지 끝냈다고 표시
  function markDelivered() {
    updateGallery(galleryId, { delivered: true });
  }

  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-line sticky top-0 bg-white/90 backdrop-blur-md z-10">
        <GalleryDetailHeader
          couple={GALLERY.couple}
          date={GALLERY.date}
          gallery={gallery}
          badge={badge}
          onInviteOpen={() => setInviteOpen(true)}
          onUploadOpen={() => setUploadOpen(true)}
          onMarkDelivered={markDelivered}
        />
        <GalleryDetailTabs tab={tab} onTabChange={setTab} />
      </header>

      {tab === "photos" && <GalleryPhotosTab total={GALLERY.total} />}

      {tab === "final" && <GalleryFinalSelectionTab />}

      {tab === "status" && (
        <GallerySelectionStatusTab invited={GALLERY.invited} />
      )}

      {uploadOpen && (
        <GalleryUploadModal
          onClose={() => setUploadOpen(false)}
          onConfirm={confirmUpload}
        />
      )}

      {inviteOpen && (
        <GalleryInviteModal
          onClose={() => setInviteOpen(false)}
          onConfirm={sendInvite}
        />
      )}
    </div>
  );
}

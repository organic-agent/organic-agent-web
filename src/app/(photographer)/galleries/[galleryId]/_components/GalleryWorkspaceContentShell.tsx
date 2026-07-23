"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getGalleryBadge, updateGallery, useGalleries } from "@/lib/galleries";
import { useSelectedIds } from "@/lib/galleryPhotos";
import {
  summarizePhotoWorkflows,
  usePhotographerPhotoWorkflows,
} from "@/lib/photographerPhotoWorkflow";
import { GalleryDeliveryConfirmModal } from "./GalleryDeliveryConfirmModal";
import { GalleryDetailHeader } from "./GalleryDetailHeader";
import { GalleryInviteModal } from "./GalleryInviteModal";
import { GalleryUploadModal } from "./GalleryUploadModal";

type Props = {
  children: React.ReactNode;
};

export function GalleryWorkspaceContentShell({ children }: Props) {
  const { galleryId } = useParams<{ galleryId: string }>();
  const router = useRouter();
  const galleries = useGalleries();
  const gallery = galleries.find((item) => item.id === galleryId);
  const badge = gallery ? getGalleryBadge(gallery) : null;
  const selectedIds = useSelectedIds();
  const workflows = usePhotographerPhotoWorkflows();
  const workflowSummary = summarizePhotoWorkflows(workflows, selectedIds);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false);

  function sendInvite() {
    updateGallery(galleryId, { invited: true });
    setInviteOpen(false);
  }

  function confirmUpload() {
    updateGallery(galleryId, {
      uploaded: true,
      total: gallery && gallery.total > 0 ? gallery.total : 620,
    });
    setUploadOpen(false);
  }

  function markDelivered() {
    updateGallery(galleryId, { delivered: true });
    setDeliveryConfirmOpen(false);
  }

  function reviewIncompletePhotos() {
    setDeliveryConfirmOpen(false);
    router.push(
      `/galleries/${galleryId}/final-selection?workStatus=incomplete#work-status`,
    );
  }

  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-line sticky top-0 bg-white/90 backdrop-blur-md z-10">
        <GalleryDetailHeader
          couple={gallery?.couple ?? "민준 & 서연"}
          date="2026.05.17"
          gallery={gallery}
          badge={badge}
          onInviteOpen={() => setInviteOpen(true)}
          onUploadOpen={() => setUploadOpen(true)}
          onMarkDelivered={() => setDeliveryConfirmOpen(true)}
        />
      </header>

      {children}

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

      {deliveryConfirmOpen && (
        <GalleryDeliveryConfirmModal
          summary={workflowSummary}
          onClose={() => setDeliveryConfirmOpen(false)}
          onConfirm={markDelivered}
          onReviewIncomplete={reviewIncompletePhotos}
        />
      )}
    </div>
  );
}

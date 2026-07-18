"use client";

/**
 * 부부 — 협업 셀렉 폴더 상세
 * 위치: src/app/(couple)/collaboration/[folderId]/page.tsx
 *
 * 협업 폴더 안의 사진을 중심으로 가족·지인의 반응과 의견을 확인한다.
 * 사진을 선택하면 오른쪽 패널에서 해당 사진의 의견을 바로 볼 수 있다.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import {
  addComment,
  useFolders,
  type CollabComment,
  type CollabPhoto,
} from "@/lib/couple";
import { CollaborationCommentsPanel } from "./_components/CollaborationCommentsPanel";
import { CollaborationDetailHeader } from "./_components/CollaborationDetailHeader";
import { CollaborationPhotoGrid } from "./_components/CollaborationPhotoGrid";
import { CollaborationShareModal } from "./_components/CollaborationShareModal";
import { CollaborationSummaryCards } from "./_components/CollaborationSummaryCards";
import { VoteCreateModal } from "./_components/VoteCreateModal";
import { VoteLinkNotice } from "./_components/VoteLinkNotice";

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

function photoReactionTotal(photo: CollabPhoto) {
  return photo.good + photo.soso + photo.sad;
}

function photoComments(
  comments: CollabComment[],
  activePhotoId: number | "all",
) {
  if (activePhotoId === "all") return comments;
  return comments.filter((comment) => comment.photoId === activePhotoId);
}

export default function CollaborationDetailPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const folders = useFolders();
  const folder = folders.find((f) => f.id === folderId);
  const [activePhotoId, setActivePhotoId] = useState<number | "all">("all");
  const [draft, setDraft] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopyState, setShareCopyState] = useState<
    "idle" | "copied" | "failed"
  >("idle");
  const [voteOpen, setVoteOpen] = useState(false);
  const [votePhotoIds, setVotePhotoIds] = useState<number[]>([]);
  const [voteMessage, setVoteMessage] = useState("");
  const [voteLink, setVoteLink] = useState("");
  const [voteCopyState, setVoteCopyState] = useState<
    "idle" | "copied" | "failed"
  >("idle");

  useEffect(() => {
    if (shareCopyState === "idle") return;
    const timer = window.setTimeout(() => setShareCopyState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [shareCopyState]);

  useEffect(() => {
    if (voteCopyState === "idle") return;
    const timer = window.setTimeout(() => setVoteCopyState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [voteCopyState]);

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

  const currentFolder = folder;
  const comments: CollabComment[] = folder.comments;
  const activePhoto =
    activePhotoId === "all"
      ? null
      : folder.photos.find((photo) => photo.id === activePhotoId) ?? null;
  const visibleComments = photoComments(comments, activePhotoId);
  const totalReactions = folder.photos.reduce(
    (sum, photo) => sum + photoReactionTotal(photo),
    0,
  );
  const shareUrl = `https://www.easyselect.kr/collaboration/${folder.id}`;

  function submitComment() {
    if (!draft.trim()) return;
    addComment(currentFolder.id, {
      author: "나",
      avatar: "나",
      text: draft.trim(),
      photoId: activePhoto?.id,
    });
    setDraft("");
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopyState("copied");
    } catch {
      setShareCopyState("failed");
    }
  }

  async function copyVoteLink() {
    if (!voteLink) return;
    try {
      await navigator.clipboard.writeText(voteLink);
      setVoteCopyState("copied");
    } catch {
      setVoteCopyState("failed");
    }
  }

  function toggleVotePhoto(photoId: number) {
    setVotePhotoIds((current) => {
      if (current.includes(photoId))
        return current.filter((id) => id !== photoId);
      if (current.length >= 2) return current;
      return [...current, photoId];
    });
  }

  function createVoteLink() {
    if (votePhotoIds.length !== 2) return;
    const nextVoteLink = `https://www.easyselect.kr/vote/${currentFolder.id}?photos=${votePhotoIds.join("-")}`;
    setVoteLink(nextVoteLink);
    setVoteOpen(false);
    setVoteMessage("선택한 2장으로 투표 링크를 만들었어요.");
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
          onVoteClick={() => setVoteOpen(true)}
          onShareClick={() => setShareOpen(true)}
        />

        <div className="px-6 md:px-8 py-8 space-y-6">
          <CollaborationSummaryCards
            photoCount={folder.photos.length}
            commentCount={comments.length}
            reactionCount={totalReactions}
          />

          <VoteLinkNotice
            message={voteMessage}
            voteLink={voteLink}
            copyState={voteCopyState}
            onCopy={copyVoteLink}
            onClose={() => {
              setVoteMessage("");
              setVoteLink("");
            }}
          />

          <div className="grid xl:grid-cols-[1fr_360px] gap-8 items-start">
            <CollaborationPhotoGrid
              photos={folder.photos}
              comments={comments}
              activePhotoId={activePhotoId}
              onActivePhotoChange={setActivePhotoId}
            />

            <CollaborationCommentsPanel
              folderName={folder.name}
              activePhoto={activePhoto}
              visibleComments={visibleComments}
              draft={draft}
              onDraftChange={setDraft}
              onSubmit={submitComment}
            />
          </div>
        </div>
      </main>

      {shareOpen && (
        <CollaborationShareModal
          shareUrl={shareUrl}
          shareCode={SHARE_CODE}
          expiresIn={SHARE_EXPIRES_IN}
          copyState={shareCopyState}
          onCopy={copyShareLink}
          onClose={() => setShareOpen(false)}
        />
      )}

      {voteOpen && (
        <VoteCreateModal
          photos={folder.photos}
          selectedPhotoIds={votePhotoIds}
          onTogglePhoto={toggleVotePhoto}
          onCreate={createVoteLink}
          onClose={() => setVoteOpen(false)}
        />
      )}
    </div>
  );
}

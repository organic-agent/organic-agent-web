"use client";

/**
 * 게스트 공유 묶음 — 사이드바 공유 탭 + 초대 · 새 공유폴더 모달 + 하객 반응(집계 · 반응 보기)을 한 훅으로 (2단계 · 3단계가 같이 쓴다)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useGuestSharing.tsx
 *
 * 상단 초대 버튼(page)이 inviteOpen으로 열고, 사이드바 카드를 누르면 그 공유폴더의 반응 보기(reactionsView)가 메인을 대신한다.
 * 초대 모달에서 "새 공유폴더"를 누르면 초대 모달을 닫고 만들기 모달을 연 뒤, 만들면 초대 모달(링크 만들기)로 돌아온다.
 */

import { useState, type ReactNode } from "react";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { PhotoResponse } from "@/lib/api/photos";
import { CreateShareFolderModal } from "./CreateShareFolderModal";
import { InviteGuestsBody, InviteGuestsModal, type InviteTab } from "./InviteGuestsModal";
import { PersonalInviteModal } from "./PersonalInviteModal";
import { ReactionsView } from "./ReactionsView";
import { ShareFolderTab } from "./ShareFolderTab";
import { useCollabSessions } from "./useCollabSessions";
import { useGuestReactions, type GuestReactions } from "./useGuestReactions";

export function useGuestSharing({
  galleryId,
  photos,
  folders,
  pickedIds,
  inviteOpen,
  onInviteClose,
  personal,
}: {
  galleryId: number;
  photos: PhotoResponse[];
  folders: ConceptFolderResponse[] | null;
  pickedIds: ReadonlySet<number>;
  /** 상단 초대 버튼으로 열림 */
  inviteOpen: boolean;
  onInviteClose: () => void;
  /** 개인 갤러리 — 초대 모달이 파트너 | 게스트 탭(PersonalInviteModal)이 된다 */
  personal?: { galleryTitle: string };
}): {
  shareTab: ReactNode;
  modals: ReactNode;
  /** 사이드바 카드로 연 공유폴더의 반응 보기 — 있으면 메인 대신 그린다 */
  reactionsView: ReactNode | null;
  reactionsOpen: boolean;
  closeReactions: () => void;
  /** 공유폴더 전부의 사진별 좋아요 · 댓글 합(2단계 "하객 반응" 토글) */
  reactions: GuestReactions;
} {
  const collab = useCollabSessions(galleryId, true);
  const reactions = useGuestReactions(galleryId, collab.sessions);
  const [sideInvite, setSideInvite] = useState<InviteTab | null>(null);
  const [create, setCreate] = useState<{ returnToInvite: boolean } | null>(null);
  const [reactionSession, setReactionSession] = useState<number | null>(null);
  const openSession = reactionSession !== null ? collab.sessions?.find((s) => s.sessionId === reactionSession) ?? null : null;

  const open = inviteOpen || sideInvite !== null;
  const initialTab: InviteTab = sideInvite ?? "new";
  function closeInvite() {
    setSideInvite(null);
    onInviteClose();
  }

  const shareTab = (
    <ShareFolderTab
      collab={collab}
      summaryOf={reactions.summaryOf}
      currentSessionId={openSession?.sessionId ?? null}
      onOpenReactions={setReactionSession}
      onCreate={() => setCreate({ returnToInvite: false })}
    />
  );
  const reactionsView = openSession ? (
    <ReactionsView key={openSession.sessionId} galleryId={galleryId} session={openSession} photos={reactions.bySession.get(openSession.sessionId) ?? (reactions.loading ? null : [])} />
  ) : null;

  const modals = (
    <>
      {open && !create && (personal ? (
        <PersonalInviteModal
          galleryId={galleryId}
          galleryTitle={personal.galleryTitle}
          initialTab={sideInvite !== null ? "guest" : "partner"}
          guest={
            <InviteGuestsBody
              galleryId={galleryId}
              collab={collab}
              initialTab={initialTab}
              onClose={closeInvite}
              onCreateShareFolder={() => {
                closeInvite();
                setCreate({ returnToInvite: true });
              }}
            />
          }
          onClose={closeInvite}
        />
      ) : (
        <InviteGuestsModal
          galleryId={galleryId}
          collab={collab}
          initialTab={initialTab}
          onClose={closeInvite}
          onCreateShareFolder={() => {
            closeInvite();
            setCreate({ returnToInvite: true });
          }}
        />
      ))}
      {create && (
        <CreateShareFolderModal
          galleryId={galleryId}
          photos={photos}
          folders={folders}
          pickedIds={pickedIds}
          onClose={() => {
            const back = create.returnToInvite;
            setCreate(null);
            if (back) setSideInvite("new");
          }}
          onCreated={() => {
            const back = create.returnToInvite;
            setCreate(null);
            void collab.reload();
            if (back) setSideInvite("new");
          }}
        />
      )}
    </>
  );

  return { shareTab, modals, reactionsView, reactionsOpen: openSession !== null, closeReactions: () => setReactionSession(null), reactions };
}

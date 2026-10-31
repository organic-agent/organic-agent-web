"use client";

/**
 * 게스트 공유 묶음 — 사이드바 공유 탭 + 초대 · 새 공유폴더 모달 + 하객 반응(집계 · 반응 보기)을 한 훅으로 (2단계 · 3단계가 같이 쓴다)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useGuestSharing.tsx
 *
 * 상단 초대 버튼(page)이 inviteOpen으로 열고, 사이드바 카드를 누르면 그 공유폴더의 반응 보기(reactionsView)가 메인을 대신한다.
 * 초대 모달에서 "새 공유폴더"를 누르면 초대 모달을 닫고 만들기 모달을 연 뒤, 만들면 초대 모달이 방금 만든 링크 카드로
 * 다시 열린다(팀 노션 73번) — 링크를 바로 복사할 수 있게.
 * modals는 함수 — 셀렉 화면이 그릴 때 "지금 보는 사진"(폴더 + 필터 결과, 이슈 149)을 넘기면 만들기 모달에 그 범위가 생긴다.
 */

import { blockInDemo } from "@/lib/demo/demoMode";
import { useState, type ReactNode } from "react";
import type { CollabSessionResponse } from "@/lib/api/collab";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { PhotoResponse } from "@/lib/api/photos";
import { CreateShareFolderModal, type VisibleScope } from "./CreateShareFolderModal";
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
  /** 개인 갤러리 **소유자** — 초대 모달이 파트너 | 게스트 탭(PersonalInviteModal)이 된다. 파트너는 비워 두면 게스트 초대 모달(초대 클라이언트와 같음) */
  personal?: { galleryTitle: string };
}): {
  shareTab: ReactNode;
  /** 초대 · 만들기 모달 — visible은 만들기 모달의 "지금 보는 사진" 범위(없으면 그 줄을 안 그린다) */
  modals: (extra?: { visible?: VisibleScope | null }) => ReactNode;
  /** 사이드바 카드로 연 공유폴더의 반응 보기 — 있으면 메인 대신 그린다 */
  reactionsView: ReactNode | null;
  reactionsOpen: boolean;
  closeReactions: () => void;
  /** 공유폴더 전부의 사진별 좋아요 · 댓글 합(2단계 "하객 반응" 토글) */
  reactions: GuestReactions;
  /** 공유폴더 수(폐기 · 만료 포함) — 0이면 "게스트 반응" 버튼이 켜지지 않고 스낵바로 알린다(이슈 156). null이면 아직 못 읽음 */
  sessionCount: number | null;
} {
  const collab = useCollabSessions(galleryId, true);
  const reactions = useGuestReactions(galleryId, collab.sessions);
  const [sideInvite, setSideInvite] = useState<InviteTab | null>(null);
  /** 초대 모달에서 만들기로 갔다가 돌아올 때 바로 보여 줄 공유폴더 */
  const [justMade, setJustMade] = useState<CollabSessionResponse | null>(null);
  const [create, setCreate] = useState<{ returnToInvite: boolean } | null>(null);
  const [reactionSession, setReactionSession] = useState<number | null>(null);
  const openSession = reactionSession !== null ? collab.sessions?.find((s) => s.sessionId === reactionSession) ?? null : null;

  const open = inviteOpen || sideInvite !== null;
  const initialTab: InviteTab = sideInvite ?? "new";
  function closeInvite() {
    setSideInvite(null);
    setJustMade(null);
    onInviteClose();
  }

  const shareTab = (
    <ShareFolderTab
      collab={collab}
      summaryOf={reactions.summaryOf}
      currentSessionId={openSession?.sessionId ?? null}
      onOpenReactions={setReactionSession}
      onCreate={() => {
        if (!blockInDemo("공유폴더 만들기")) setCreate({ returnToInvite: false });
      }}
    />
  );
  const reactionsView = openSession ? (
    <ReactionsView key={openSession.sessionId} galleryId={galleryId} session={openSession} photos={reactions.bySession.get(openSession.sessionId) ?? (reactions.loading ? null : [])} />
  ) : null;

  const modals = (extra?: { visible?: VisibleScope | null }) => (
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
              initialMade={justMade}
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
          initialMade={justMade}
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
          visible={extra?.visible ?? null}
          onClose={() => {
            const back = create.returnToInvite;
            setCreate(null);
            if (back) setSideInvite("new");
          }}
          onCreated={(session) => {
            const back = create.returnToInvite;
            setCreate(null);
            void collab.reload();
            if (back) {
              setJustMade(session);
              setSideInvite("new");
            }
          }}
        />
      )}
    </>
  );

  return { shareTab, modals, reactionsView, reactionsOpen: openSession !== null, closeReactions: () => setReactionSession(null), reactions, sessionCount: collab.sessions?.length ?? null };
}

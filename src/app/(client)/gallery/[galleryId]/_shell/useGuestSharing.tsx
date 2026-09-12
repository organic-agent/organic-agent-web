"use client";

/**
 * 게스트 공유 묶음 — 사이드바 공유 탭 내용 + 초대 · 새 공유폴더 모달을 한 훅으로 (2단계 · 3단계가 같이 쓴다)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/useGuestSharing.tsx
 *
 * 상단 초대 버튼(page)이 inviteOpen으로 열고, 사이드바 카드는 "만든 링크" 탭으로 연다. 초대 모달에서 "새 공유폴더"를 누르면
 * 초대 모달을 닫고 만들기 모달을 연 뒤, 만들면 초대 모달(링크 만들기)로 돌아온다 — 모달을 겹치지 않기 위해.
 */

import { useState, type ReactNode } from "react";
import type { ConceptFolderResponse } from "@/lib/api/conceptFolders";
import type { PhotoResponse } from "@/lib/api/photos";
import { CreateShareFolderModal } from "./CreateShareFolderModal";
import { InviteGuestsModal, type InviteTab } from "./InviteGuestsModal";
import { ShareFolderTab } from "./ShareFolderTab";
import { useCollabSessions } from "./useCollabSessions";

export function useGuestSharing({
  galleryId,
  photos,
  folders,
  pickedIds,
  inviteOpen,
  onInviteClose,
}: {
  galleryId: number;
  photos: PhotoResponse[];
  folders: ConceptFolderResponse[] | null;
  pickedIds: ReadonlySet<number>;
  /** 상단 초대 버튼으로 열림 */
  inviteOpen: boolean;
  onInviteClose: () => void;
}): { shareTab: ReactNode; modals: ReactNode } {
  const collab = useCollabSessions(galleryId, true);
  const [sideInvite, setSideInvite] = useState<InviteTab | null>(null);
  const [create, setCreate] = useState<{ returnToInvite: boolean } | null>(null);

  const open = inviteOpen || sideInvite !== null;
  const initialTab: InviteTab = sideInvite ?? "new";
  function closeInvite() {
    setSideInvite(null);
    onInviteClose();
  }

  const shareTab = <ShareFolderTab collab={collab} onOpenManage={() => setSideInvite("list")} onCreate={() => setCreate({ returnToInvite: false })} />;

  const modals = (
    <>
      {open && !create && (
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
      )}
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

  return { shareTab, modals };
}

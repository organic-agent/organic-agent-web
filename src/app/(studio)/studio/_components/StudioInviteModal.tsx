"use client";

/**
 * 팀원(작가) 초대 모달 — 스튜디오 홈 상단바 초대 버튼 (와이어프레임 10 작가 탭 · 보드 V1 + I2)
 * 위치: src/app/(studio)/studio/_components/StudioInviteModal.tsx
 *
 * 초대 링크(InviteLinkBox) + 멤버 목록(이름 · 역할, 초대 링크 대기 행) + 하단 "멤버 관리"
 * (→ 설정 › 그 스튜디오 › 멤버). 초대는 소유자만 — 홈은 소유자에게만 초대 버튼을 보여준다.
 */

import { useEffect, useState } from "react";
import { ManageAccountsIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { listStudioMembers, type StudioMemberResponse } from "@/lib/api/studios";
import { useAuth } from "@/lib/auth/authStore";
import { GalleryModalShell } from "./GalleryModalShell";
import { InviteLinkBox, useStudioInviteLink } from "./InviteLinkBox";

export const STUDIO_ROLE_LABEL: Record<StudioMemberResponse["role"], string> = {
  OWNER: "소유자",
  MEMBER: "멤버",
};

/** 소유자 먼저, 같은 역할은 이름순 */
export function sortStudioMembers(members: StudioMemberResponse[]) {
  return [...members].sort((a, b) =>
    a.role === b.role
      ? a.nickname.localeCompare(b.nickname, "ko")
      : a.role === "OWNER"
        ? -1
        : 1,
  );
}

export function StudioInviteModal({
  workspaceId,
  studioName,
  onClose,
  onManageMembers,
}: {
  workspaceId: number;
  studioName: string;
  onClose: () => void;
  /** 하단 "멤버 관리" — 설정의 멤버 화면으로 */
  onManageMembers: () => void;
}) {
  const auth = useAuth();
  const myUserId = auth.status === "authenticated" ? auth.user.id : null;
  const invite = useStudioInviteLink(workspaceId);
  const [members, setMembers] = useState<StudioMemberResponse[] | null>(null);
  const [membersError, setMembersError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listStudioMembers(workspaceId);
        if (!cancelled) setMembers(sortStudioMembers(list));
      } catch {
        if (!cancelled) setMembersError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const link = invite.state;

  return (
    <GalleryModalShell
      title="팀원 초대"
      desc={studioName}
      maxWidthClassName="max-w-[460px]"
      onClose={onClose}
    >
      <InviteLinkBox {...invite} />

      <div className="my-4 h-px bg-divider-default" />

      <p className="mb-1 flex justify-between type-label-semibold-xs text-contents-light-bgd-default">
        <span>멤버 {members ? members.length : ""}</span>
        {link.kind === "ready" && (
          <span className="font-normal text-contents-light-bgd-weakness">초대 링크 1</span>
        )}
      </p>
      <ul className="flex flex-col">
        {members === null ? (
          <li className="py-2 type-content-xs text-contents-light-bgd-sub">
            {membersError ? "멤버 목록을 불러오지 못했어요" : "불러오는 중…"}
          </li>
        ) : (
          members.map((m) => (
            <li key={m.memberId} className="flex items-center gap-2.5 py-2">
              <Avatar initial={m.nickname.trim().slice(0, 1) || "?"} />
              <span className="truncate type-content-m font-medium text-contents-light-bgd-default">
                {m.nickname}
                {m.userId === myUserId && (
                  <span className="ml-1 font-normal text-contents-light-bgd-weakness">(나)</span>
                )}
              </span>
              <span className="type-content-xs text-contents-light-bgd-sub">
                {STUDIO_ROLE_LABEL[m.role]}
              </span>
            </li>
          ))
        )}
        {link.kind === "ready" && (
          <li className="flex items-center gap-2.5 py-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-default-lightness type-content-xs text-contents-light-bgd-weakness">
              ?
            </span>
            <span className="type-content-m text-contents-light-bgd-sub">초대 링크</span>
            <span className="type-content-xs text-contents-light-bgd-weakness">
              {link.daysLeft}일 남음 ·{" "}
              {link.link.usedCount > 0
                ? `${link.link.usedCount}명 들어옴`
                : "아직 아무도 안 들어옴"}
            </span>
            <span className="ml-auto rounded-(--pill) bg-surface-default-light px-2 py-0.5 type-label-semibold-xs text-contents-light-bgd-sub">
              대기
            </span>
          </li>
        )}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-2">
        <Button kind="ghost" icon={<ManageAccountsIcon size={18} />} onClick={onManageMembers}>
          멤버 관리
        </Button>
        <Button kind="ghost" onClick={onClose} className="border border-border-default">
          닫기
        </Button>
      </div>
    </GalleryModalShell>
  );
}

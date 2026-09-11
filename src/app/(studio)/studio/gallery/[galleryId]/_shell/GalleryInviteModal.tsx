"use client";

/**
 * 초대 모달 — 클라이언트 | 작가 탭 (와이어프레임 10, 스튜디오 홈 팀원 초대 모달과 같은 구조)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/_shell/GalleryInviteModal.tsx
 *
 * 클라이언트 탭: 갤러리 초대 링크(함께 쓰는 링크 1개 · 7일 · 정원 2) 조회 · 발급 · 복사 · 재발급 ·
 * 폐기 + 들어온 사람 현황. 작가 탭: 스튜디오 팀원 초대(StudioInviteBody) 그대로.
 * 상단 초대 아이콘과 하단 "클라이언트 초대" 버튼이 같은 모달을 연다. 카카오톡 공유 없음.
 */

import { useEffect, useState } from "react";
import { GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import {
  InviteLinkBox,
  toInviteLinkState,
  type InviteLinkState,
} from "@/app/(studio)/studio/_components/InviteLinkBox";
import { StudioInviteBody } from "@/app/(studio)/studio/_components/StudioInviteModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { listGalleryMembers, type GalleryMemberResponse } from "@/lib/api/galleries";
import {
  getCurrentInvite,
  issueInvite,
  revokeInvite,
  type GalleryInviteResponse,
} from "@/lib/api/invites";

const GALLERY_CAPACITY = 2;
const CLIENT_HINT = (
  <>
    링크 1개를 함께 써요 · 7일 뒤 만료 · 정원 2명
    <br />
    들어오면 회원가입 뒤 이 갤러리로 바로 연결돼요
  </>
);

export type InviteTab = "client" | "studio";

export function useGalleryInviteLink(galleryId: number) {
  const [state, setState] = useState<InviteLinkState<GalleryInviteResponse>>({ kind: "loading" });
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const link = await getCurrentInvite(galleryId);
        if (!cancelled) setState(toInviteLinkState(link));
      } catch {
        // 발급한 적 없거나 폐기만 해둔 갤러리는 404 — "링크 만들기"로
        if (!cancelled) setState({ kind: "none" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId]);

  async function issue() {
    if (issuing) return;
    setIssuing(true);
    setError(null);
    try {
      setState(toInviteLinkState(await issueInvite(galleryId)));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "링크를 만들지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setIssuing(false);
    }
  }

  async function revoke() {
    if (state.kind !== "ready") return;
    setError(null);
    try {
      await revokeInvite(galleryId, state.link.id);
      setState({ kind: "none" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "링크를 폐기하지 못했어요.");
    }
  }

  return { state, issue, issuing, error, revoke };
}

function joinedLabel(iso: string | null): string {
  if (!iso) return "수락";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "수락";
  return `수락 · ${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}

function ClientInviteBody({
  galleryId,
  members,
  onClose,
}: {
  galleryId: number;
  members: GalleryMemberResponse[] | null;
  onClose: () => void;
}) {
  const invite = useGalleryInviteLink(galleryId);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const joined = members?.length ?? 0;
  const waiting = Math.max(0, GALLERY_CAPACITY - joined);

  return (
    <>
      <InviteLinkBox
        state={invite.state}
        issue={invite.issue}
        issuing={invite.issuing}
        error={invite.error}
        hint={CLIENT_HINT}
      />

      <div className="my-4 h-px bg-divider-default" />

      <p className="mb-1 flex justify-between type-label-semibold-xs text-contents-light-bgd-default">
        <span>현황</span>
        <span className="font-normal text-contents-light-bgd-weakness">
          {members === null ? "…" : `${joined} / ${GALLERY_CAPACITY}명`}
        </span>
      </p>
      <ul className="flex flex-col">
        {members === null ? (
          <li className="py-2 type-content-xs text-contents-light-bgd-sub">불러오는 중…</li>
        ) : (
          members.map((m) => (
            <li key={m.memberId} className="flex items-center gap-2.5 py-2">
              <Avatar initial={m.nickname.trim().slice(0, 1) || "?"} />
              <span className="truncate type-content-m font-medium text-contents-light-bgd-default">
                {m.nickname}
              </span>
              <span className="type-content-xs text-contents-light-bgd-sub">클라이언트</span>
              <span className="ml-auto rounded-(--pill) bg-function-success-background px-2 py-0.5 type-label-semibold-xs text-function-success-default">
                {joinedLabel(m.joinedAt)}
              </span>
            </li>
          ))
        )}
        {members !== null && waiting > 0 && (
          <li className="flex items-center gap-2.5 py-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-default-lightness type-content-xs text-contents-light-bgd-weakness">
              ?
            </span>
            <span className="type-content-m text-contents-light-bgd-sub">
              아직 들어오지 않은 {waiting}명
            </span>
            <span className="ml-auto rounded-(--pill) bg-surface-default-light px-2 py-0.5 type-label-semibold-xs text-contents-light-bgd-sub">
              대기
            </span>
          </li>
        )}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-2">
        {invite.state.kind === "ready" ? (
          confirmRevoke ? (
            <span className="flex items-center gap-2 type-content-xs text-contents-light-bgd-sub">
              전달한 링크가 바로 막혀요.
              <button
                type="button"
                onClick={() => {
                  setConfirmRevoke(false);
                  void invite.revoke();
                }}
                className="cursor-pointer font-semibold text-function-error-default underline underline-offset-2"
              >
                폐기
              </button>
              <button
                type="button"
                onClick={() => setConfirmRevoke(false)}
                className="cursor-pointer underline underline-offset-2"
              >
                취소
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRevoke(true)}
              className="cursor-pointer type-content-xs text-function-error-default underline underline-offset-2"
            >
              링크 폐기
            </button>
          )
        ) : (
          <span />
        )}
        <Button kind="ghost" onClick={onClose} className="border border-border-default">
          닫기
        </Button>
      </div>
    </>
  );
}

export function GalleryInviteModal({
  galleryId,
  galleryTitle,
  workspaceId,
  studioName,
  canInviteStudio,
  initialTab = "client",
  onClose,
  onManageMembers,
}: {
  galleryId: number;
  galleryTitle: string;
  workspaceId: number;
  studioName: string;
  /** 작가 탭은 스튜디오 소유자에게만 */
  canInviteStudio: boolean;
  initialTab?: InviteTab;
  onClose: () => void;
  onManageMembers: () => void;
}) {
  const [tab, setTab] = useState<InviteTab>(canInviteStudio ? initialTab : "client");
  const [members, setMembers] = useState<GalleryMemberResponse[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listGalleryMembers(galleryId);
        if (!cancelled) setMembers(list);
      } catch {
        if (!cancelled) setMembers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId]);

  return (
    <GalleryModalShell
      title="초대"
      desc={tab === "client" ? galleryTitle : studioName}
      maxWidthClassName="max-w-[460px]"
      onClose={onClose}
    >
      {canInviteStudio && (
        <div role="tablist" className="mb-4 flex rounded-(--radius-8) bg-surface-default-light p-0.75">
          {(["client", "studio"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`h-8 flex-1 cursor-pointer rounded-(--radius-8) type-label-medium-s transition-colors duration-fast ${
                tab === key
                  ? "bg-background-default-main font-semibold text-contents-light-bgd-default shadow-(--shadow-hover)"
                  : "text-contents-light-bgd-sub hover:text-contents-light-bgd-default"
              }`}
            >
              {key === "client" ? "클라이언트" : "작가"}
            </button>
          ))}
        </div>
      )}
      {tab === "client" ? (
        <ClientInviteBody galleryId={galleryId} members={members} onClose={onClose} />
      ) : (
        <StudioInviteBody workspaceId={workspaceId} onClose={onClose} onManageMembers={onManageMembers} />
      )}
    </GalleryModalShell>
  );
}

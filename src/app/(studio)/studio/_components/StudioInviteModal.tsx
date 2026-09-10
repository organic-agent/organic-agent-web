"use client";

/**
 * 팀원(작가) 초대 모달 — 스튜디오 홈 상단바 초대 버튼 (와이어프레임 10 작가 탭 · 보드 V1 + I2)
 * 위치: src/app/(studio)/studio/_components/StudioInviteModal.tsx
 *
 * 링크 박스 안에 복사 아이콘(인풋 그룹), 아래 한 줄 힌트 오른쪽에 재발급, 멤버 목록(이름 · 역할,
 * 초대 링크 대기 행), 하단 "멤버 관리".
 * 링크는 7일 뒤 만료하고 재발급하면 이전 링크는 못 쓴다. 받은 작가는 회원가입 후
 * 바로 스튜디오 멤버가 된다(초대 수락 페이지 경유). 역할 변경 · 내보내기는 스튜디오 설정에서.
 */

import { useEffect, useRef, useState } from "react";
import {
  CheckCircleIcon,
  CopyIcon,
  ManageAccountsIcon,
} from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ApiError } from "@/lib/api/client";
import {
  getStudioInviteLink,
  issueStudioInviteLink,
  listStudioMembers,
  type StudioInviteResponse,
  type StudioMemberResponse,
} from "@/lib/api/studios";
import { useAuth } from "@/lib/auth/authStore";
import { GalleryModalShell } from "./GalleryModalShell";

const ROLE_LABEL: Record<StudioMemberResponse["role"], string> = {
  OWNER: "소유자",
  MEMBER: "멤버",
};

type LinkState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "ready"; link: StudioInviteResponse; daysLeft: number };

function toLinkState(link: StudioInviteResponse | null): LinkState {
  if (!link || link.status !== "ACTIVE") return { kind: "none" };
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(link.expiresAt).getTime() - Date.now()) / 86_400_000),
  );
  return { kind: "ready", link, daysLeft };
}

/** 화면에는 프로토콜을 뺀 주소만 — 복사는 전체 URL */
const displayUrl = (url: string) => url.replace(/^https?:\/\//, "");

export function StudioInviteModal({
  workspaceId,
  studioName,
  onClose,
  onManageMembers,
}: {
  workspaceId: number;
  studioName: string;
  onClose: () => void;
  /** 하단 "멤버 관리" — 스튜디오 설정의 멤버 화면으로 */
  onManageMembers: () => void;
}) {
  const auth = useAuth();
  const myUserId = auth.status === "authenticated" ? auth.user.id : null;
  const [linkState, setLinkState] = useState<LinkState>({ kind: "loading" });
  const [members, setMembers] = useState<StudioMemberResponse[] | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const copiedTimer = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [link, memberList] = await Promise.allSettled([
        getStudioInviteLink(workspaceId),
        listStudioMembers(workspaceId),
      ]);
      if (cancelled) return;
      // 발급한 적 없는 스튜디오는 404 — "링크 만들기"로
      setLinkState(toLinkState(link.status === "fulfilled" ? link.value : null));
      if (memberList.status === "fulfilled") setMembers(memberList.value);
      else setBanner("멤버 목록을 불러오지 못했어요.");
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(copiedTimer.current);
    };
  }, [workspaceId]);

  async function issue() {
    if (issuing) return;
    setIssuing(true);
    setBanner(null);
    try {
      const link = await issueStudioInviteLink(workspaceId);
      setLinkState(toLinkState(link));
    } catch (err) {
      setBanner(
        err instanceof ApiError
          ? err.message
          : "링크를 만들지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setIssuing(false);
    }
  }

  async function copy() {
    if (linkState.kind !== "ready") return;
    try {
      await navigator.clipboard.writeText(linkState.link.inviteUrl);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setBanner("복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  const sortedMembers = members
    ? [...members].sort((a, b) =>
        a.role === b.role ? a.nickname.localeCompare(b.nickname, "ko") : a.role === "OWNER" ? -1 : 1,
      )
    : null;

  return (
    <GalleryModalShell
      title="팀원 초대"
      desc={studioName}
      maxWidthClassName="max-w-[460px]"
      onClose={onClose}
    >
      {linkState.kind === "loading" ? (
        <div className="h-12 animate-pulse rounded-(--radius-8) bg-surface-default-light" />
      ) : linkState.kind === "none" ? (
        <div className="flex items-center justify-between gap-3 rounded-(--radius-8) border border-dashed border-border-default px-4 py-3">
          <p className="type-content-s text-contents-light-bgd-sub">아직 초대 링크가 없어요</p>
          <Button size="sm" onClick={() => void issue()} disabled={issuing}>
            {issuing ? "만드는 중…" : "링크 만들기"}
          </Button>
        </div>
      ) : (
        // 인풋 그룹 — 링크가 주인공이라 복사는 박스 안 아이콘으로
        <div
          className="flex h-12 items-center gap-1 rounded-(--radius-8) border border-border-default bg-surface-default-lightness pr-1.5 pl-4"
          title={linkState.link.inviteUrl}
        >
          <span className="min-w-0 flex-1 truncate type-content-s text-contents-light-bgd-default tabular-nums">
            {displayUrl(linkState.link.inviteUrl)}
          </span>
          <IconButton
            icon={
              copied ? (
                <span className="text-brand-secondary-dark">
                  <CheckCircleIcon size={20} />
                </span>
              ) : (
                <CopyIcon size={20} />
              )
            }
            aria-label={copied ? "복사됨" : "링크 복사"}
            onClick={() => void copy()}
            className="shrink-0"
          />
        </div>
      )}
      <p className="mt-2 flex items-center justify-between gap-3 type-content-xs text-contents-light-bgd-sub">
        <span className="truncate">7일 뒤 만료 · 받은 작가는 회원가입 후 바로 멤버가 돼요</span>
        {linkState.kind === "ready" && (
          <button
            type="button"
            onClick={() => void issue()}
            disabled={issuing}
            className="shrink-0 cursor-pointer text-brand-secondary-dark underline underline-offset-2 disabled:text-contents-light-bgd-disabled"
          >
            {issuing ? "재발급 중…" : "재발급"}
          </button>
        )}
      </p>

      <div className="my-4 h-px bg-divider-default" />

      <p className="mb-1 flex justify-between type-label-semibold-xs text-contents-light-bgd-default">
        <span>멤버 {members ? members.length : ""}</span>
        {linkState.kind === "ready" && (
          <span className="font-normal text-contents-light-bgd-weakness">초대 링크 1</span>
        )}
      </p>
      <ul className="flex flex-col">
        {sortedMembers === null ? (
          <li className="py-2 type-content-xs text-contents-light-bgd-sub">불러오는 중…</li>
        ) : (
          sortedMembers.map((m) => (
            <li key={m.memberId} className="flex items-center gap-2.5 py-2">
              <Avatar initial={m.nickname.trim().slice(0, 1) || "?"} />
              <span className="truncate type-content-m font-medium text-contents-light-bgd-default">
                {m.nickname}
                {m.userId === myUserId && (
                  <span className="ml-1 font-normal text-contents-light-bgd-weakness">(나)</span>
                )}
              </span>
              <span className="type-content-xs text-contents-light-bgd-sub">{ROLE_LABEL[m.role]}</span>
            </li>
          ))
        )}
        {linkState.kind === "ready" && (
          <li className="flex items-center gap-2.5 py-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-default-lightness type-content-xs text-contents-light-bgd-weakness">
              ?
            </span>
            <span className="type-content-m text-contents-light-bgd-sub">초대 링크</span>
            <span className="type-content-xs text-contents-light-bgd-weakness">
              {linkState.daysLeft}일 남음 ·{" "}
              {linkState.link.usedCount > 0
                ? `${linkState.link.usedCount}명 들어옴`
                : "아직 아무도 안 들어옴"}
            </span>
            <span className="ml-auto rounded-(--pill) bg-surface-default-light px-2 py-0.5 type-label-semibold-xs text-contents-light-bgd-sub">
              대기
            </span>
          </li>
        )}
      </ul>

      {banner && (
        <p role="alert" className="mt-3 text-center type-content-xs text-function-error-default">
          {banner}
        </p>
      )}

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

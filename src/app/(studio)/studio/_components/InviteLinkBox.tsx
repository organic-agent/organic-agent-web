"use client";

/**
 * 작가 초대 링크 — 조회·발급·복사·재발급을 한 덩어리로 (보드 I2)
 * 위치: src/app/(studio)/studio/_components/InviteLinkBox.tsx
 *
 * 링크 박스 안 오른쪽에 복사 아이콘(인풋 그룹), 아래 한 줄 힌트 오른쪽에 재발급.
 * 팀원 초대 모달과 설정 › 멤버가 같이 쓴다. 상태는 useStudioInviteLink가 들고,
 * InviteLinkBox는 그리기만 한다 — 모달이 "대기" 행에 같은 링크 상태를 쓰기 때문.
 */

import { useEffect, useRef, useState } from "react";
import { CheckCircleIcon, CopyIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ApiError } from "@/lib/api/client";
import {
  getStudioInviteLink,
  issueStudioInviteLink,
  type StudioInviteResponse,
} from "@/lib/api/studios";

export type InviteLinkState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "ready"; link: StudioInviteResponse; daysLeft: number };

function toState(link: StudioInviteResponse | null): InviteLinkState {
  if (!link || link.status !== "ACTIVE") return { kind: "none" };
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(link.expiresAt).getTime() - Date.now()) / 86_400_000),
  );
  return { kind: "ready", link, daysLeft };
}

/** 화면에는 프로토콜을 뺀 주소만 — 복사는 전체 URL */
const displayUrl = (url: string) => url.replace(/^https?:\/\//, "");

export function useStudioInviteLink(workspaceId: number) {
  const [state, setState] = useState<InviteLinkState>({ kind: "loading" });
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const link = await getStudioInviteLink(workspaceId);
        if (!cancelled) setState(toState(link));
      } catch {
        // 발급한 적 없는 스튜디오는 404 — "링크 만들기"로
        if (!cancelled) setState({ kind: "none" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  async function issue() {
    if (issuing) return;
    setIssuing(true);
    setError(null);
    try {
      setState(toState(await issueStudioInviteLink(workspaceId)));
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

  return { state, issue, issuing, error };
}

export function InviteLinkBox({
  state,
  issue,
  issuing,
  error,
}: ReturnType<typeof useStudioInviteLink>) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    if (state.kind !== "ready") return;
    try {
      await navigator.clipboard.writeText(state.link.inviteUrl);
      setCopied(true);
      setCopyError(false);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div>
      {state.kind === "loading" ? (
        <div className="h-12 animate-pulse rounded-(--radius-8) bg-surface-default-light" />
      ) : state.kind === "none" ? (
        <div className="flex items-center justify-between gap-3 rounded-(--radius-8) border border-dashed border-border-default px-4 py-3">
          <p className="type-content-s text-contents-light-bgd-sub">아직 초대 링크가 없어요</p>
          <Button size="sm" onClick={() => void issue()} disabled={issuing}>
            {issuing ? "만드는 중…" : "링크 만들기"}
          </Button>
        </div>
      ) : (
        <div
          className="flex h-12 items-center gap-1 rounded-(--radius-8) border border-border-default bg-surface-default-lightness pr-1.5 pl-4"
          title={state.link.inviteUrl}
        >
          <span className="min-w-0 flex-1 truncate type-content-s text-contents-light-bgd-default tabular-nums">
            {displayUrl(state.link.inviteUrl)}
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
        {state.kind === "ready" && (
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
      {(error || copyError) && (
        <p role="alert" className="mt-2 type-content-xs text-function-error-default">
          {error ?? "복사하지 못했어요. 링크를 직접 선택해 복사해 주세요."}
        </p>
      )}
    </div>
  );
}

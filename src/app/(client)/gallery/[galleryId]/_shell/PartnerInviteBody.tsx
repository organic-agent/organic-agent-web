"use client";

/**
 * 파트너 초대 본문 — 링크(발급 · 복사 · 재발급 · 폐기) + 현황(소유자 · 파트너 · 내보내기) (묶음 D, 2026-09-23)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/PartnerInviteBody.tsx
 *
 * 개인 초대 모달의 파트너 탭과 설정 › 개인 갤러리 › 파트너 탭이 같은 본문을 쓴다. 작가 갤러리 초대 모달의
 * 클라이언트 탭(ClientInviteBody)과 같은 구조 — 링크 상자 아래는 "7일 뒤 만료 · 한 사람" 한 줄만(수민 결정).
 * 링크는 kind PERSONAL_PARTNER · maxUses 1(소유자 + 파트너 = 정원 2). 파트너가 들어오면 링크는 닫히고,
 * 소유자는 파트너를 내보낼 수 있다(정원이 2라 잘못 초대했을 때 되돌릴 길 — DELETE members/{id}).
 * 멤버 목록은 GET members가 개인 갤러리면 워크스페이스 멤버(소유자 포함)를 돌려준다.
 */

import { useCallback, useEffect, useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { InviteLinkBox, type InviteLinkState, toInviteLinkState } from "@/app/(studio)/studio/_components/InviteLinkBox";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { listGalleryMembers, removeGalleryMember, type GalleryMemberResponse } from "@/lib/api/galleries";
import { getCurrentInvite, issueInvite, revokeInvite, type GalleryInviteResponse } from "@/lib/api/invites";
import { useAuth } from "@/lib/auth/authStore";

/** 소유자 + 파트너 */
const CAPACITY = 2;

export function usePartnerInviteLink(galleryId: number) {
  const [state, setState] = useState<InviteLinkState<GalleryInviteResponse>>({ kind: "loading" });
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

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
  }, [galleryId, nonce]);

  async function issue() {
    if (issuing) return;
    setIssuing(true);
    setError(null);
    try {
      setState(toInviteLinkState(await issueInvite(galleryId, { kind: "PERSONAL_PARTNER", maxUses: 1 })));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "링크를 만들지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
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

  return { state, issue, issuing, error, revoke, reload: useCallback(() => setNonce((n) => n + 1), []) };
}

function joinedLabel(iso: string | null): string {
  if (!iso) return "수락";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "수락";
  return `수락 · ${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}

export function PartnerInviteBody({
  galleryId,
  canManage,
  onClose,
}: {
  galleryId: number;
  /** 소유자 — 링크 발급 · 폐기 · 파트너 내보내기 */
  canManage: boolean;
  /** 모달 안이면 아래에 닫기 버튼 */
  onClose?: () => void;
}) {
  const auth = useAuth();
  const myUserId = auth.status === "authenticated" ? auth.user.id : null;
  const invite = usePartnerInviteLink(galleryId);
  const [members, setMembers] = useState<GalleryMemberResponse[] | null>(null);
  const [membersNonce, setMembersNonce] = useState(0);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [removing, setRemoving] = useState<GalleryMemberResponse | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

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
  }, [galleryId, membersNonce]);

  const joined = members?.length ?? 0;
  const full = members !== null && joined >= CAPACITY;
  const waiting = Math.max(0, CAPACITY - joined);

  async function remove(member: GalleryMemberResponse) {
    if (removeBusy) return;
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      await removeGalleryMember(galleryId, member.memberId);
      setRemoving(null);
      setMembersNonce((n) => n + 1);
      invite.reload(); // 정원이 다시 비면 링크 상태도 바뀐다
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : "내보내지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setRemoveBusy(false);
    }
  }

  return (
    <>
      {full ? (
        <p className="flex h-12 items-center rounded-(--radius-8) border border-divider-default bg-surface-default-lightness px-4 type-content-s text-contents-light-bgd-sub">
          정원이 찼어요 · 링크는 닫혔어요
        </p>
      ) : (
        <InviteLinkBox state={invite.state} issue={invite.issue} issuing={invite.issuing} error={invite.error} hint="7일 뒤 만료 · 한 사람" />
      )}

      <div className="my-4 h-px bg-divider-default" />

      <p className="mb-1 flex justify-between type-label-semibold-xs text-contents-light-bgd-default">
        <span>현황</span>
        <span className="font-normal text-contents-light-bgd-weakness">{members === null ? "…" : `${joined} / ${CAPACITY}명`}</span>
      </p>
      <ul className="flex flex-col">
        {members === null ? (
          <li className="py-2 type-content-xs text-contents-light-bgd-sub">불러오는 중…</li>
        ) : (
          members.map((m) => {
            const me = m.userId === myUserId;
            return (
              <li key={m.memberId} className="flex items-center gap-2.5 py-2">
                <Avatar initial={m.nickname.trim().slice(0, 1) || "?"} />
                <span className="truncate type-content-m font-medium text-contents-light-bgd-default">{m.nickname}</span>
                <span className="type-content-xs text-contents-light-bgd-sub">{me ? (canManage ? "소유자" : "파트너") : canManage ? "파트너" : "소유자"}</span>
                {me ? (
                  <span className="ml-auto rounded-(--pill) bg-brand-secondary-background px-2 py-0.5 type-label-semibold-xs text-brand-secondary-dark">나</span>
                ) : (
                  <span className="ml-auto flex items-center gap-2">
                    <span className="rounded-(--pill) bg-function-success-background px-2 py-0.5 type-label-semibold-xs text-function-success-default">{joinedLabel(m.joinedAt)}</span>
                    {canManage && (
                      <button type="button" onClick={() => setRemoving(m)} className="cursor-pointer type-content-xs text-function-error-default underline underline-offset-2">
                        내보내기
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })
        )}
        {members !== null && waiting > 0 && (
          <li className="flex items-center gap-2.5 py-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-default-lightness type-content-xs text-contents-light-bgd-weakness">?</span>
            <span className="type-content-m text-contents-light-bgd-sub">아직 들어오지 않은 {waiting}명</span>
            <span className="ml-auto rounded-(--pill) bg-surface-default-light px-2 py-0.5 type-label-semibold-xs text-contents-light-bgd-sub">대기</span>
          </li>
        )}
      </ul>

      {(onClose || (canManage && invite.state.kind === "ready" && !full)) && (
        <div className="mt-5 flex items-center justify-between gap-2">
          {canManage && invite.state.kind === "ready" && !full ? (
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
                <button type="button" onClick={() => setConfirmRevoke(false)} className="cursor-pointer underline underline-offset-2">
                  취소
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmRevoke(true)} className="cursor-pointer type-content-xs text-function-error-default underline underline-offset-2">
                링크 폐기
              </button>
            )
          ) : (
            <span />
          )}
          {onClose && (
            <Button kind="ghost" onClick={onClose} className="border border-border-default">
              닫기
            </Button>
          )}
        </div>
      )}

      {removing && (
        <GalleryModalShell
          title={`${removing.nickname} 님을 내보낼까요?`}
          desc="이 갤러리를 더 볼 수 없어요. 다시 초대하면 돌아올 수 있어요."
          maxWidthClassName="max-w-105"
          onClose={() => setRemoving(null)}
        >
          {removeError && (
            <p role="alert" className="mb-4 text-center type-content-xs text-function-error-default">
              {removeError}
            </p>
          )}
          <GalleryModalButtons onClose={() => setRemoving(null)} onConfirm={() => void remove(removing)} confirmLabel={removeBusy ? "내보내는 중…" : "내보내기"} confirmVariant="danger" disabled={removeBusy} />
        </GalleryModalShell>
      )}
    </>
  );
}

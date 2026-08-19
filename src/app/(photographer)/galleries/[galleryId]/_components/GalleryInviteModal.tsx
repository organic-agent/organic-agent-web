"use client";

/**
 * 작가 — 부부 초대 모달
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/GalleryInviteModal.tsx
 *
 * 워크스페이스 탑바의 공유 버튼에서 열어 초대 링크를 관리한다.
 * 서버 계약: 갤러리당 유효한 링크는 항상 하나(7일 유효, 정원 2명).
 * 현재 링크 조회의 404는 "아직 발급 안 함"이라는 정상 상태다.
 *
 * 재발급은 이전 링크를 즉시 무효화하므로, 살아 있는 링크가 있을 때는
 * 경고를 거쳐 실행한다(만료된 링크의 재발급은 잃을 것이 없어 바로 실행).
 * 폐기해도 이미 들어온 부부는 그대로 남는다 — 문구가 그 사실을 말해준다.
 */

import { useCallback, useEffect, useState } from "react";
import {
  deadlineDateLabel,
  deadlineOffset,
} from "@/app/(photographer)/_lib/galleryStatus";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import {
  type GalleryMemberResponse,
  listGalleryMembers,
} from "@/lib/api/galleries";
import {
  type GalleryInviteResponse,
  getCurrentInvite,
  issueInvite,
  revokeInvite,
} from "@/lib/api/invites";
import { GalleryModalShell } from "../../_components/GalleryModalShell";

type Props = {
  galleryId: number;
  onClose: () => void;
};

type InviteState = GalleryInviteResponse | "none";

export function GalleryInviteModal({ galleryId, onClose }: Props) {
  const [invite, setInvite] = useState<InviteState | null>(null); // null = 조회 중
  const [members, setMembers] = useState<GalleryMemberResponse[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  /** 살아 있는 링크의 재발급은 파괴적 — 한 번 더 묻는다. */
  const [confirmReissue, setConfirmReissue] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await getCurrentInvite(galleryId).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return "none";
          throw err;
        });
        const memberList = await listGalleryMembers(galleryId).catch(() => []);
        if (cancelled) return;
        setInvite(current as InviteState);
        setMembers(memberList);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId, nonce]);

  const retryLoad = useCallback(() => {
    setInvite(null);
    setLoadError(false);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function copyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  async function issue() {
    if (busy) return;
    setBusy(true);
    setBanner(null);
    try {
      setInvite(await issueInvite(galleryId));
      setConfirmReissue(false);
    } catch (err) {
      setBanner(
        err instanceof ApiError
          ? err.message
          : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(current: GalleryInviteResponse) {
    if (busy) return;
    setBusy(true);
    setBanner(null);
    try {
      await revokeInvite(galleryId, current.id);
      setInvite("none");
    } catch (err) {
      setBanner(
        err instanceof ApiError
          ? err.message
          : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  // 만료 표시: "2026.08.26 · 6일 남음" 문법 (지나면 status가 EXPIRED로 온다)
  function expiryLabel(current: GalleryInviteResponse) {
    const date = deadlineDateLabel(current.expiresAt) ?? "";
    const offset = deadlineOffset(current.expiresAt);
    if (offset === null) return date;
    if (offset < 0) return `${date} · ${-offset}일 남음`;
    if (offset === 0) return `${date} · 오늘까지`;
    return `${date} · 만료됨`;
  }

  const memberLine =
    members.length === 0
      ? "아직 들어온 사람이 없어요"
      : members.map((m) => m.nickname).join(" · ");

  return (
    <GalleryModalShell
      title="부부 초대"
      desc="링크 하나로 신랑·신부가 함께 들어와요. 링크는 7일 동안 유효해요."
      onClose={onClose}
    >
      {invite === null && !loadError && (
        <p className="mb-6 py-6 text-center type-body-medium text-fg-neutral-muted">
          초대 정보를 불러오는 중이에요…
        </p>
      )}

      {loadError && (
        <div className="mb-6 flex flex-col items-center gap-3 py-4 text-center">
          <p className="type-body-medium text-fg-neutral-muted">
            초대 정보를 불러오지 못했어요.
          </p>
          <Button size="sm" onClick={retryLoad}>
            다시 시도
          </Button>
        </div>
      )}

      {invite !== null && !loadError && (
        <>
          {/* 부부 입장 현황 — 정원 2명 */}
          <div className="mb-3 rounded-(--radius-8) border border-stroke-neutral-muted px-4 py-3">
            <p className="mb-1 type-body-small text-fg-neutral-muted">
              부부 입장 {members.length}/2
            </p>
            <p className="truncate type-label-button text-fg-neutral">
              {memberLine}
            </p>
          </div>

          {invite === "none" ? (
            <p className="mb-6 type-body-small text-fg-neutral-muted">
              아직 초대 링크가 없어요. 링크를 만들어 신혼부부에게 보내주세요.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <div
                  className={`flex h-10 min-w-0 flex-1 items-center truncate rounded-(--radius-8) border border-stroke-neutral-muted bg-bg-layer-default-hover px-3.5 type-body-small ${
                    invite.status === "ACTIVE"
                      ? "text-fg-neutral-muted"
                      : "text-fg-disabled line-through"
                  }`}
                >
                  {invite.inviteUrl}
                </div>
                {invite.status === "ACTIVE" && (
                  <Button
                    size="sm"
                    onClick={() => copyInviteUrl(invite.inviteUrl)}
                    className="shrink-0"
                  >
                    {copyState === "copied" ? "복사됨" : "복사"}
                  </Button>
                )}
              </div>
              {copyState === "failed" && (
                <p className="mb-3 type-body-small text-fg-critical">
                  복사에 실패했어요. 링크를 직접 선택해서 복사해주세요.
                </p>
              )}
              <div className="mb-6 rounded-(--radius-8) border border-stroke-neutral-muted px-4 py-3">
                <p className="mb-1 type-body-small text-fg-neutral-muted">
                  링크 만료
                </p>
                <p
                  className={`type-label-button ${
                    invite.status === "ACTIVE"
                      ? "text-fg-neutral"
                      : "text-fg-critical"
                  }`}
                >
                  {invite.status === "ACTIVE"
                    ? expiryLabel(invite)
                    : "만료된 링크예요 — 다시 발급해 주세요"}
                </p>
              </div>
            </>
          )}

          {banner && (
            <p
              role="alert"
              className="mb-4 text-center type-body-small text-fg-critical"
            >
              {banner}
            </p>
          )}

          {/* 액션 — 재발급 경고는 살아 있는 링크가 있을 때만 */}
          {confirmReissue && invite !== "none" && invite.status === "ACTIVE" ? (
            <div className="flex flex-col gap-3">
              <p className="type-body-small text-fg-critical">
                다시 발급하면 이전에 보낸 링크는 즉시 쓸 수 없게 돼요. 이미
                전달했다면 새 링크를 다시 보내야 해요.
              </p>
              <div className="flex gap-2">
                <Button
                  kind="ghost"
                  onClick={() => setConfirmReissue(false)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button onClick={issue} disabled={busy} className="flex-1">
                  {busy ? "발급 중…" : "새 링크 발급"}
                </Button>
              </div>
            </div>
          ) : invite === "none" ? (
            <Button onClick={issue} disabled={busy} className="w-full">
              {busy ? "만드는 중…" : "초대 링크 만들기"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => revoke(invite)}
                disabled={busy}
                className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-(--pill) px-5 type-label-button text-fg-critical transition-colors duration-fast hover:bg-bg-layer-default-hover disabled:pointer-events-none disabled:opacity-40"
              >
                {busy ? "처리 중…" : "링크 폐기"}
              </button>
              <Button
                onClick={() =>
                  invite.status === "ACTIVE" ? setConfirmReissue(true) : issue()
                }
                disabled={busy}
                className="flex-1"
              >
                재발급
              </Button>
            </div>
          )}
        </>
      )}
    </GalleryModalShell>
  );
}

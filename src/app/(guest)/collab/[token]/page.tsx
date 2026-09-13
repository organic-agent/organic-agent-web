"use client";

/**
 * 게스트 — 링크(/collab/{token})로 들어온 가족 · 친구의 화면 (C6, 2026-09-13 보드 확정)
 * 위치: src/app/(guest)/collab/[token]/page.tsx
 *
 * 링크 열기(표지 카드) → 이름(들어올 때, 랜덤 이름) → 앨범 홈(표지 헤더 + 카드) → 앨범 안(제목 드롭다운 · 그리드).
 * 공유폴더가 1개면 이름 뒤 바로 그리드만. 로그인 없음 · 알림 없음. 게스트 토큰은 앨범(세션)마다 따로라 이름을 적으면
 * 링크에 딸린 앨범 전부에 같은 이름으로 입장한다(includeAllAlbums). 사진 보기 · 좋아요 · 댓글은 다음 PR.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { CollabPhotoResponse } from "@/lib/api/collab";
import {
  enterGuest,
  getGuestLanding,
  guestLinkProblemOf,
  listAllGuestPhotos,
  renameGuest,
  type CollabLandingResponse,
  type GuestLinkProblem,
} from "@/lib/api/collabGuest";
import { AlbumCards } from "./_shell/AlbumCards";
import { ALL_ALBUMS, AlbumGrid } from "./_shell/AlbumGrid";
import { GoneCard, LandingCard } from "./_shell/LandingCard";
import { GuestTopbar } from "./_shell/GuestTopbar";
import { NameModal } from "./_shell/NameModal";
import { parseGuest, readGuestRaw, useStoredGuest, writeGuest } from "./_shell/guestMemory";
import { displayTitleOf } from "./_shell/guestView";

type LandingState = { kind: "loading" } | { kind: "ready"; landing: CollabLandingResponse } | { kind: "problem"; problem: GuestLinkProblem } | { kind: "error" };
type View = { kind: "landing" } | { kind: "home" } | { kind: "album"; token: string; mineOnly: boolean };
const EMPTY_PHOTOS: ReadonlyMap<string, CollabPhotoResponse[]> = new Map();

export default function GuestCollabPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const guest = useStoredGuest(token);
  const [state, setState] = useState<LandingState>({ kind: "loading" });
  const [view, setView] = useState<View>({ kind: "landing" });
  const [nameModal, setNameModal] = useState<"enter" | "rename" | null>(null);
  /** 앨범 토큰별 사진 — key가 지금 원하는 것(앨범 목록 · 재조회 횟수)과 다르면 아직 읽는 중 */
  const [photos, setPhotos] = useState<{ key: string; byToken: ReadonlyMap<string, CollabPhotoResponse[]>; error: boolean } | null>(null);
  const [photosNonce, setPhotosNonce] = useState(0);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", landing: await getGuestLanding(token) });
    } catch (err) {
      const problem = guestLinkProblemOf(err);
      setState(problem ? { kind: "problem", problem } : { kind: "error" });
    }
  }, [token]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const landing = await getGuestLanding(token);
        if (!cancelled) setState({ kind: "ready", landing });
      } catch (err) {
        if (cancelled) return;
        const problem = guestLinkProblemOf(err);
        setState(problem ? { kind: "problem", problem } : { kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const landing = state.kind === "ready" ? state.landing : null;
  const albums = useMemo(() => landing?.albums ?? [], [landing]);
  const multi = albums.length > 1;
  const title = landing ? displayTitleOf(landing, token) : "";
  const inside = view.kind !== "landing";
  const photosKey = `${photosNonce}:${albums.map((a) => a.collabToken).join(",") || token}`;
  const photosByToken = photos?.key === photosKey ? photos.byToken : EMPTY_PHOTOS;
  const photosLoading = inside && photos?.key !== photosKey;
  const photosError = photos?.key === photosKey && photos.error;

  // ── 사진 — 들어온 뒤 링크에 딸린 앨범 전부(앨범마다 보관된 게스트 토큰으로 → liked) ──
  useEffect(() => {
    if (!inside || !landing) return;
    let cancelled = false;
    (async () => {
      const targets = albums.length > 0 ? albums.map((a) => a.collabToken) : [token];
      const entries = await Promise.all(
        targets.map(async (t) => {
          const g = parseGuest(readGuestRaw(t));
          try {
            return [t, await listAllGuestPhotos(t, g?.guestToken ?? null)] as const;
          } catch {
            return [t, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setPhotos({
        key: photosKey,
        byToken: new Map(entries.filter((e): e is readonly [string, CollabPhotoResponse[]] => e[1] !== null)),
        error: entries.some((e) => e[1] === null),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [inside, landing, albums, token, photosKey]);

  function enter() {
    setView(multi ? { kind: "home" } : { kind: "album", token, mineOnly: false });
  }
  function goIn() {
    if (guest) enter();
    else setNameModal("enter");
  }

  /** 이름 적기 · 바꾸기 — 링크에 딸린 앨범 전부에(토큰이 앨범마다 따로) */
  async function submitName(nickname: string) {
    const mode = nameModal ?? "enter";
    const targets = albums.length > 0 ? albums.map((a) => a.collabToken) : [token];
    const results = await Promise.allSettled(
      targets.map(async (t) => {
        const existing = parseGuest(readGuestRaw(t));
        if (existing) {
          if (mode === "enter") return;
          const r = await renameGuest(t, existing.guestToken, nickname);
          writeGuest(t, { guestToken: existing.guestToken, nickname: r.nickname, participantId: r.participantId });
          return;
        }
        const r = await enterGuest(t, nickname);
        writeGuest(t, { guestToken: r.guestToken, nickname: r.nickname, participantId: r.participantId });
      }),
    );
    const own = results[targets.indexOf(token)];
    if (own && own.status === "rejected") throw own.reason;
    setNameModal(null);
    setPhotosNonce((n) => n + 1);
    if (mode === "enter") enter();
  }

  // ── 못 여는 링크 · 로딩 ──
  if (state.kind !== "ready") {
    return (
      <div className="flex min-h-dvh flex-col bg-background-default-main">
        <GuestTopbar nickname={null} />
        <div className="grid flex-1 place-items-center px-6 py-8">
          {state.kind === "loading" ? <div className="h-40 w-full max-w-115 animate-pulse rounded-(--radius-16) bg-surface-default-light" aria-busy="true" /> : <GoneCard problem={state.kind === "problem" ? state.problem : "error"} onRetry={() => void load()} />}
        </div>
      </div>
    );
  }

  const ready = state.landing;
  const nickname = guest?.nickname ?? null;
  const gridMid = view.kind === "album" ? ready.galleryTitle : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-default-main">
      <GuestTopbar mid={gridMid} nickname={inside ? nickname : null} onRename={() => setNameModal("rename")} />

      {view.kind === "landing" ? (
        <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto px-6 py-8">
          <LandingCard landing={ready} title={title} onGo={goIn} />
        </div>
      ) : view.kind === "home" ? (
        <AlbumCards
          landing={ready}
          title={title}
          photosByToken={photosByToken}
          onOpenAlbum={(a) => setView({ kind: "album", token: a.collabToken, mineOnly: false })}
          onOpenMine={() => setView({ kind: "album", token: ALL_ALBUMS, mineOnly: true })}
        />
      ) : (
        <AlbumGrid
          albums={albums}
          current={view.token}
          photosByToken={photosByToken}
          loading={photosLoading}
          error={photosError}
          mineOnly={view.mineOnly}
          onMineOnlyChange={(v) => setView({ ...view, mineOnly: v })}
          onBack={multi ? () => setView({ kind: "home" }) : undefined}
          onSwitch={(t) => setView({ kind: "album", token: t, mineOnly: false })}
        />
      )}

      {nameModal && (
        <NameModal
          mode={nameModal}
          initial={nameModal === "rename" ? nickname ?? undefined : undefined}
          onClose={() => setNameModal(null)}
          onSubmit={submitName}
        />
      )}
    </div>
  );
}

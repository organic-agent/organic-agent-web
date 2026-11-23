"use client";

/**
 * 클라이언트 — 앨범(이슈 168 PR ③)
 * 위치: src/app/(client)/gallery/[galleryId]/album/page.tsx
 *
 * 스튜디오가 보낸 앨범을 연다 — 보기만이면 넘겨 보기 · 미리보기만, 수정 가능이면 사진 교체 · 위치 조정 · 비우기(시안 2판 4 · 5번).
 * 들어오는 길은 갤러리 사이드바 "앨범" 행. 서버 계약 전(1단계, 플래그 NEXT_PUBLIC_ALBUM_EDITOR)이라 스튜디오가 이 브라우저에서
 * 보낸 앨범을 읽는다(localStorage) — 보내지 않았으면 갤러리로 돌려보낸다. 수정 가능이면 받은 앨범의 사본(`sel.album.{id}.client`)을
 * 고치고, 스튜디오가 다시 보내면 새 앨범으로 다시 시작한다. 스튜디오에 보내기(돌려보내기)는 서버 뒤.
 * 들어오면 사이드바를 접고 나가면 들어오기 전 상태로(작가 앨범 화면과 같음).
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSidebar } from "@/components/SidebarProvider";
import { Button } from "@/components/ui/Button";
import { issuePreviewAccess } from "@/lib/api/previewAccess";
import { destinationAfterLeaving } from "@/lib/auth/refreshMe";
import { usePreviewAccess } from "@/lib/usePreviewAccess";
import { ALBUM_EDITOR_ENABLED } from "@/lib/album/flag";
import { indexFrames, withAutoCursor, type Album } from "@/lib/album/model";
import { clientAlbumRepository, localAlbumRepository, newAlbumDoc, readOnlyAlbumRepository, type AlbumDoc, type AlbumShareMode } from "@/lib/album/store";
import { ShellTopbar } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellTopbar";
import { AlbumWorkspace } from "@/app/(studio)/studio/gallery/[galleryId]/album/_album/AlbumWorkspace";
import { useAlbumSelection, useAlbumSource } from "@/app/(studio)/studio/gallery/[galleryId]/album/_album/useAlbumSource";
import { useInvitedGallery } from "../../_lib/useInvitedGallery";
import { ClientSidebar } from "../_shell/ClientSidebar";
import { clientStageIndexOf, clientStagesOf } from "../_shell/clientStages";

export default function ClientAlbumPage() {
  return ALBUM_EDITOR_ENABLED ? <ClientAlbumScreen /> : <BackToGallery />;
}

/** 플래그가 꺼진 곳 — 갤러리 화면으로 */
function BackToGallery() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/gallery/${params.galleryId}`);
  }, [router, params.galleryId]);
  return null;
}

/** 받은 앨범을 처음 펼칠 때 — 첫 펼침면 · 첫 빈 프레임부터 */
function opened(album: Album): Album {
  const F = indexFrames(album.spreads);
  return withAutoCursor({ ...album, spread: 0 }, F, 0);
}

type Received = { mode: AlbumShareMode; doc: AlbumDoc; base: Album };

/** 스튜디오가 보낸 앨범 → 화면이 열 앨범. 수정 가능이면 사본(없거나 다시 보냈으면 새로) */
function receive(galleryId: number): Received | null {
  const share = localAlbumRepository.load(galleryId)?.share;
  if (!share) return null;
  const base = opened(share.album);
  if (share.mode === "view") return { mode: "view", base, doc: { ...newAlbumDoc(base), savedAt: share.sentAt } };
  const mine = clientAlbumRepository.load(galleryId);
  if (mine && mine.basedOn === share.sentAt) return { mode: "edit", base, doc: mine };
  const doc: AlbumDoc = { ...newAlbumDoc(base), basedOn: share.sentAt };
  try {
    clientAlbumRepository.save(galleryId, doc);
  } catch {
    // 저장이 막힌 브라우저 — 고치기는 되고, 저장 실패는 머리줄이 알린다
  }
  return { mode: "edit", base, doc };
}

function ClientAlbumScreen() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const galleryId = Number(params.galleryId);

  // 들어오면 사이드바 접기 · 나가면 들어오기 전 상태로
  const { collapsed, setCollapsed } = useSidebar();
  const collapsedAtEntry = useRef(collapsed);
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) return;
    const before = collapsedAtEntry.current;
    setCollapsed(true);
    return () => setCollapsed(before);
  }, [setCollapsed]);

  const { result } = useInvitedGallery(params.galleryId);
  const gallery = result?.kind === "ready" ? result.gallery : null;
  const [received, setReceived] = useState<Received | null>(null);
  const [accessReady, setAccessReady] = useState(false);

  // 볼 수 없는 갤러리 → 소속 목록 또는 랜딩으로
  useEffect(() => {
    if (result?.kind !== "notFound") return;
    let cancelled = false;
    (async () => {
      const to = await destinationAfterLeaving();
      if (!cancelled) router.replace(to);
    })();
    return () => {
      cancelled = true;
    };
  }, [result, router]);

  // 갤러리를 읽으면 미리보기 쿠키 → 받은 앨범(없으면 갤러리로)
  useEffect(() => {
    if (!gallery) return;
    let cancelled = false;
    (async () => {
      await Promise.allSettled([issuePreviewAccess(galleryId)]);
      if (cancelled) return;
      const r = receive(galleryId);
      if (!r) {
        router.replace(`/gallery/${galleryId}`);
        return;
      }
      setReceived(r);
      setAccessReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [gallery, galleryId, router]);

  const { selection, reload: reloadSelection } = useAlbumSelection(galleryId, accessReady);
  usePreviewAccess(galleryId, accessReady, reloadSelection);
  const { photos, retouchCount } = useAlbumSource(galleryId, gallery, selection);

  if (result?.kind === "error") {
    return (
      <div className="grid min-h-dvh place-items-center bg-background-default-main px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="type-title-m text-contents-light-bgd-default">앨범을 열 수 없어요</h1>
          <p className="type-content-m text-contents-light-bgd-sub">갤러리를 불러오지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.</p>
          <Button href={`/gallery/${galleryId}`}>갤러리로</Button>
        </div>
      </div>
    );
  }

  const edit = received?.mode === "edit";
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-default-main">
      <ShellTopbar
        stages={clientStagesOf(gallery, false, true)}
        stageIndex={gallery ? clientStageIndexOf("album", gallery, false, true) : null}
        deadlineStage={1}
        deadline={null}
        notificationHrefFor={(n) => (n.scope === "GALLERY" && n.scopeId !== null ? `/gallery/${n.scopeId}` : null)}
      />
      {gallery && received && photos ? (
        <AlbumWorkspace
          galleryId={galleryId}
          title={gallery.title}
          initialDoc={received.doc}
          photos={photos}
          retouchBanner={null}
          role={edit ? "clientEdit" : "clientView"}
          repo={edit ? clientAlbumRepository : readOnlyAlbumRepository}
          base={received.base}
          renderSidebar={() =>
            !collapsed && (
              <ClientSidebar
                title={gallery.title}
                status={{ text: edit ? "앨범 구성 · 고치는 중" : "앨범 구성 · 스튜디오가 보냈어요", tone: "accent" }}
                phase="album"
                photoCount={null}
                selectedCount={selection?.selectedCount ?? photos.length}
                maxSelectable={gallery.maxSelectablePhotoCount}
                retouchCount={retouchCount}
                view={null}
                onViewChange={() => router.push(`/gallery/${galleryId}`)}
                album={{ trailing: `${received.base.spreads.length}면`, current: true, onOpen: () => {} }}
              />
            )
          }
        />
      ) : (
        <div className="flex-1" aria-busy="true" />
      )}
    </div>
  );
}

"use client";

/**
 * 작가 — 앨범 구성(이슈 168 PR ①, 스튜디오 쪽)
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/page.tsx
 *
 * 들어오는 길은 사이드바 "＋ 앨범 만들기"(선택 사진 1장부터) · 보정 확정 뒤 하단 주 버튼뿐이다. 앨범은 갤러리 화면의 "앨범 만들기"
 * 창에서 만든다(PR ②) — 앨범이 없는데 이 주소로 오면 갤러리 화면으로 돌려보내 그 창을 연다(?album=new).
 * 앨범은 서버에 저장한다(PR ④). 운영 서버에 앨범 API가 올라가기 전이라 플래그(NEXT_PUBLIC_ALBUM_EDITOR)가 꺼져 있으면 갤러리 화면으로 돌려보낸다.
 * 들어오면 사이드바를 접어 펼침면 자리를 넓히고, 나가면 들어오기 전 상태로 돌린다(1024 미만은 편집을 막으므로 그대로).
 * 사이드바의 다른 행을 누르면 갤러리 화면의 그 보기로 돌아간다(?view=).
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSidebar } from "@/components/SidebarProvider";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { getGallery, type GalleryResponse } from "@/lib/api/galleries";
import { issuePreviewAccess } from "@/lib/api/previewAccess";
import { fetchStudio, type StudioResponse } from "@/lib/api/studios";
import { destinationAfterLeaving } from "@/lib/auth/refreshMe";
import { usePreviewAccess } from "@/lib/usePreviewAccess";
import { ALBUM_EDITOR_ENABLED } from "@/lib/album/flag";
import { loadAlbumDoc, serverAlbumRepository, type AlbumDoc } from "@/lib/album/store";
import { ShellSidebar } from "../_shell/ShellSidebar";
import { ShellTopbar } from "../_shell/ShellTopbar";
import { SHELL_STAGES, stageIndexOf } from "../_shell/stages";
import { AlbumWorkspace } from "./_album/AlbumWorkspace";
import { useAlbumSelection, useAlbumSource } from "./_album/useAlbumSource";

export default function StudioAlbumPage() {
  return ALBUM_EDITOR_ENABLED ? <StudioAlbumScreen /> : <BackToGallery />;
}

/** 플래그가 꺼진 곳 — 갤러리 화면으로 */
function BackToGallery() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/studio/gallery/${params.galleryId}`);
  }, [router, params.galleryId]);
  return null;
}

function StudioAlbumScreen() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const galleryId = Number(params.galleryId);

  // 들어오면 사이드바 접기 · 나가면 들어오기 전 상태로(쿠키는 건드리지 않는다)
  const { collapsed, setCollapsed } = useSidebar();
  const collapsedAtEntry = useRef(collapsed);
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) return;
    const before = collapsedAtEntry.current;
    setCollapsed(true);
    return () => setCollapsed(before);
  }, [setCollapsed]);

  const [gallery, setGallery] = useState<GalleryResponse | null>(null);
  const [studio, setStudio] = useState<StudioResponse | null>(null);
  const [doc, setDoc] = useState<AlbumDoc | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(galleryId)) return;
    let cancelled = false;
    (async () => {
      try {
        const g = await getGallery(galleryId);
        if (cancelled) return;
        // 미리보기 쿠키를 먼저 — 첫 화면 <img>가 쿠키 없이 나가 403이 되지 않게
        const [s] = await Promise.allSettled([fetchStudio(g.workspaceId), issuePreviewAccess(galleryId)]);
        if (cancelled) return;
        if (s.status === "fulfilled") setStudio(s.value);
        // 앨범이 없으면 갤러리 화면의 "앨범 만들기" 창으로
        const d = await loadAlbumDoc(galleryId);
        if (cancelled) return;
        if (!d) {
          router.replace(`/studio/gallery/${galleryId}?album=new`);
          return;
        }
        setGallery(g);
        setDoc(d);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          router.replace(await destinationAfterLeaving());
          return;
        }
        setLoadError("갤러리를 불러오지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId, router]);

  const { selection, reload: reloadSelection } = useAlbumSelection(galleryId, gallery !== null);
  usePreviewAccess(galleryId, gallery !== null, reloadSelection);
  const { photos, banner, retouchCount } = useAlbumSource(galleryId, gallery, selection);

  const baseStage = gallery ? stageIndexOf(gallery) : null;
  const stageIndex = baseStage === 1 && selection?.status === "SUBMITTED" ? 2 : baseStage;

  if (loadError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background-default-main px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="type-title-m text-contents-light-bgd-default">앨범을 열 수 없어요</h1>
          <p className="type-content-m text-contents-light-bgd-sub">{loadError}</p>
          <Button href={`/studio/gallery/${galleryId}`}>갤러리로</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-default-main">
      <ShellTopbar
        studioName={studio?.name ?? "스튜디오"}
        studioHref={studio ? `/studio/${studio.galleryUrl}` : "/studio"}
        workspaceId={gallery?.workspaceId ?? null}
        stages={SHELL_STAGES}
        stageIndex={stageIndex}
        deadline={gallery?.selectionDeadline ?? null}
      />
      {gallery && doc && photos ? (
        <AlbumWorkspace
          galleryId={galleryId}
          title={gallery.title}
          initialDoc={doc}
          photos={photos}
          retouchBanner={banner}
          repo={serverAlbumRepository}
          sendReady={gallery.stage === "ALBUM"}
          onSent={() => {
            // 확정 뒤 갤러리는 작업 완료 — 단계 칩 · 상태줄을 다시 맞춘다
            void getGallery(galleryId)
              .then(setGallery)
              .catch(() => {});
          }}
          renderSidebar={(placed) =>
            !collapsed && (
              <ShellSidebar
                title={gallery.title}
                status={
                  gallery.albumStatus === "CONFIRMED"
                    ? { text: "작업 완료 · 앨범 보냄", tone: "muted" }
                    : { text: `앨범 구성 중 · 배치 ${placed} / ${photos.length}`, tone: "accent" }
                }
                photoCount={null}
                selectedLocked={false}
                selectedCount={selection?.selectedCount ?? photos.length}
                maxSelectable={gallery.maxSelectablePhotoCount}
                retouchCount={retouchCount}
                view={null}
                onViewChange={(view) => router.push(`/studio/gallery/${galleryId}?view=${view}`)}
                album={{ exists: true, placed, selected: photos.length, current: true, onOpen: () => {} }}
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

"use client";

/**
 * 클라이언트 — 앨범(이슈 168)
 * 위치: src/app/(client)/gallery/[galleryId]/album/page.tsx
 *
 * 스튜디오가 보내고 확정한 앨범을 보기만 한다 — 넘겨 보기 · 미리보기(시안 2판 4번). 앨범은 서버에서 읽는다(PR ④).
 * 들어오는 길은 갤러리 사이드바 "앨범" 행 · 상단 "앨범 구성" 칩 · 알림. 보내기 전이면 서버가 열어 주지 않아 갤러리로 돌려보낸다.
 * 상단 단계 칩의 다른 칸은 갤러리 화면으로 — 컨셉 분류 · 셀렉은 보기만(?view=sort|select), 보정 검토 · 완료는 갤러리 첫 화면.
 * 클라이언트 수정(사진 교체 · 위치 조정 · 돌려보내기)은 잠가 두었다(결정 4) — AlbumWorkspace의 clientEdit 역할은 그대로 남아 있다.
 * 운영 서버에 앨범 API가 올라가기 전이라 플래그(NEXT_PUBLIC_ALBUM_EDITOR)가 꺼져 있으면 갤러리로 돌려보낸다.
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
import { loadAlbumDoc, type AlbumDoc } from "@/lib/album/store";
import { ShellTopbar, type StageChipState } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellTopbar";
import { AlbumWorkspace } from "@/app/(studio)/studio/gallery/[galleryId]/album/_album/AlbumWorkspace";
import { useAlbumSelection, useAlbumSource } from "@/app/(studio)/studio/gallery/[galleryId]/album/_album/useAlbumSource";
import { clientNotificationHref } from "../../_lib/notificationHref";
import { useInvitedGallery } from "../../_lib/useInvitedGallery";
import { ClientSidebar } from "../_shell/ClientSidebar";
import { clientPhaseOf, clientStageIndexOf, clientStageLabelOf, clientStagesOf } from "../_shell/clientStages";

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
  const [doc, setDoc] = useState<AlbumDoc | null>(null);
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

  // 갤러리를 읽으면 미리보기 쿠키 → 보낸 앨범(아직 안 보냈거나 못 읽으면 갤러리로)
  useEffect(() => {
    if (!gallery) return;
    let cancelled = false;
    (async () => {
      await Promise.allSettled([issuePreviewAccess(galleryId)]);
      const d = await loadAlbumDoc(galleryId).catch(() => null);
      if (cancelled) return;
      if (!d) {
        router.replace(`/gallery/${galleryId}`);
        return;
      }
      setDoc(d);
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

  const phase = gallery ? clientPhaseOf(gallery) : null;
  const stageIndex = gallery && phase ? clientStageIndexOf(phase, gallery) : null;
  const stageStates: StageChipState[] | undefined = gallery && stageIndex !== null ? clientStagesOf(gallery).map(() => "can") : undefined;
  function onStageSelect(to: number) {
    if (to === 0) router.push(`/gallery/${galleryId}?view=sort`);
    else if (to === 1) router.push(`/gallery/${galleryId}?view=select`);
    else if (to !== 3) router.push(`/gallery/${galleryId}`);
  }
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background-default-main">
      <ShellTopbar
        stages={clientStagesOf(gallery)}
        stageIndex={stageIndex}
        stageStates={stageStates}
        onStageSelect={onStageSelect}
        currentClickable
        deadlineStage={1}
        deadline={null}
        notificationHrefFor={clientNotificationHref}
      />
      {gallery && phase && doc && photos ? (
        <AlbumWorkspace
          galleryId={galleryId}
          title={gallery.title}
          initialDoc={doc}
          photos={photos}
          retouchBanner={null}
          role="clientView"
          renderSidebar={() =>
            !collapsed && (
              <ClientSidebar
                title={gallery.title}
                status={{ text: `${clientStageLabelOf(phase, gallery)} · 앨범 확정`, tone: "accent" }}
                phase={phase}
                photoCount={null}
                selectedCount={selection?.selectedCount ?? photos.length}
                maxSelectable={gallery.maxSelectablePhotoCount}
                retouchCount={retouchCount}
                view={null}
                onViewChange={() => router.push(`/gallery/${galleryId}`)}
                album={{ trailing: `${doc.album.spreads.length}면`, current: true, onOpen: () => {} }}
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

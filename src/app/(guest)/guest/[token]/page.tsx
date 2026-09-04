"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import {
  deleteCollabComment,
  enterCollab,
  getCollabLanding,
  listCollabComments,
  listCollabPhotos,
  setCollabLike,
  writeCollabComment,
  type CollabCommentResponse,
  type CollabLandingResponse,
  type CollabPhotoResponse,
} from "@/lib/api/collab";
import { getAccessToken } from "@/lib/auth/tokenStore";

function storageKey(token: string) {
  return `wes.collab.guest.${token}`;
}

export default function GuestSharedGalleryPage() {
  const { token } = useParams<{ token: string }>();
  const [landing, setLanding] = useState<CollabLandingResponse | null>(null);
  const [photos, setPhotos] = useState<CollabPhotoResponse[] | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<number | null>(null);
  const [comments, setComments] = useState<CollabCommentResponse[]>([]);
  const [guestToken, setGuestToken] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(storageKey(token)),
  );
  const [nickname, setNickname] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authenticated = useMemo(() => Boolean(getAccessToken()), []);

  useEffect(() => {
    let cancelled = false;
    void getCollabLanding(token)
      .then((result) => {
        if (!cancelled) setLanding(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "공유 링크를 열지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!authenticated && !guestToken) return;
    let cancelled = false;
    void listCollabPhotos(token, guestToken)
      .then((page) => {
        if (cancelled) return;
        setPhotos(page.contents);
        setActivePhotoId((current) => current ?? page.contents[0]?.photoId ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "사진을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [authenticated, guestToken, token]);

  useEffect(() => {
    if (activePhotoId === null || (!authenticated && !guestToken)) return;
    let cancelled = false;
    void listCollabComments(token, activePhotoId, guestToken)
      .then((page) => {
        if (!cancelled) setComments(page.contents);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activePhotoId, authenticated, guestToken, token]);

  async function enter() {
    if (!nickname.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const participant = await enterCollab(token, nickname.trim());
      window.localStorage.setItem(storageKey(token), participant.guestToken);
      setGuestToken(participant.guestToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "입장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(photo: CollabPhotoResponse) {
    if (busy || !landing?.writable) return;
    setBusy(true);
    try {
      await setCollabLike(token, photo.photoId, !photo.liked, guestToken);
      setPhotos((current) => current?.map((item) => item.photoId === photo.photoId ? {
        ...item,
        liked: !item.liked,
        likeCount: item.likeCount + (item.liked ? -1 : 1),
      } : item) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "좋아요를 반영하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function submitComment() {
    if (activePhotoId === null || !comment.trim() || busy || !landing?.writable) return;
    setBusy(true);
    try {
      const created = await writeCollabComment(token, activePhotoId, comment.trim(), guestToken);
      setComments((current) => [...current, created]);
      setPhotos((current) => current?.map((item) => item.photoId === activePhotoId ? {
        ...item,
        commentCount: item.commentCount + 1,
      } : item) ?? null);
      setComment("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "댓글을 남기지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(item: CollabCommentResponse) {
    if (!item.mine || busy) return;
    setBusy(true);
    try {
      await deleteCollabComment(token, item.commentId, guestToken);
      setComments((current) => current.filter((commentItem) => commentItem.commentId !== item.commentId));
      setPhotos((current) => current?.map((photo) => photo.photoId === activePhotoId ? {
        ...photo,
        commentCount: Math.max(0, photo.commentCount - 1),
      } : photo) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "댓글을 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const activePhoto = photos?.find((photo) => photo.photoId === activePhotoId) ?? null;

  if (!authenticated && !guestToken) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg-layer-default px-6">
        <section className="w-full max-w-md rounded-(--radius-16) border border-stroke-neutral-muted p-8">
          <BrandLogo size={40} className="mb-6 text-fg-neutral" />
          <h1 className="type-heading-large text-fg-neutral">{landing?.galleryTitle ?? "공유 갤러리"}</h1>
          <p className="mb-6 mt-2 type-body-medium text-fg-neutral-muted">표시할 닉네임을 입력하면 댓글과 좋아요를 남길 수 있습니다.</p>
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} placeholder="닉네임" className="mb-3 h-11 w-full rounded-(--radius-4) border border-stroke-neutral-muted bg-bg-layer-default px-3 text-fg-neutral" />
          {error && <p role="alert" className="mb-3 type-body-small text-fg-critical">{error}</p>}
          <Button className="w-full" disabled={busy || !nickname.trim()} onClick={() => void enter()}>{busy ? "입장 중…" : "갤러리 입장"}</Button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-bg-layer-default">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-stroke-neutral-muted bg-bg-layer-default px-6">
        <BrandLogo size={32} className="text-fg-neutral" />
        <div className="min-w-0">
          <h1 className="truncate type-heading-card text-fg-neutral">{landing?.galleryTitle ?? "공유 갤러리"}</h1>
          <p className="type-body-small text-fg-neutral-muted">{landing?.writable ? "의견 작성 가능" : "읽기 전용"}</p>
        </div>
      </header>
      {error && <p role="alert" className="mx-auto mt-4 max-w-wrap px-6 type-body-small text-fg-critical">{error}</p>}
      <main className="mx-auto grid w-full max-w-wrap gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos?.map((photo) => (
              <button key={photo.photoId} type="button" onClick={() => setActivePhotoId(photo.photoId)} className={`relative aspect-4/5 overflow-hidden rounded-(--radius-4) bg-bg-disabled ${activePhotoId === photo.photoId ? "ring-2 ring-stroke-accent" : ""}`}>
                {/* 서명 URL은 임의 호스트라 Next Image 원격 호스트 고정 설정을 사용할 수 없다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photo.photo.viewUrl && <img src={photo.photo.viewUrl} alt={photo.photo.originalFileName} className="size-full object-cover" />}
                <span className="absolute bottom-2 right-2 rounded-(--pill) bg-black/65 px-2 py-1 text-xs text-white">♥ {photo.likeCount} · 댓글 {photo.commentCount}</span>
              </button>
            ))}
          </div>
          {photos?.length === 0 && <p className="py-20 text-center type-body-medium text-fg-neutral-muted">공유된 사진이 없습니다.</p>}
        </section>
        <aside className="rounded-(--radius-12) border border-stroke-neutral-muted p-4">
          {activePhoto ? (
            <>
              <div className="mb-4 aspect-4/5 overflow-hidden rounded-(--radius-4) bg-bg-disabled">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {activePhoto.photo.viewUrl && <img src={activePhoto.photo.viewUrl} alt={activePhoto.photo.originalFileName} className="size-full object-contain" />}
              </div>
              <Button className="mb-5 w-full" kind={activePhoto.liked ? "ghost" : undefined} disabled={busy || !landing?.writable} onClick={() => void toggleLike(activePhoto)}>
                {activePhoto.liked ? "좋아요 취소" : `좋아요 ${activePhoto.likeCount}`}
              </Button>
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {comments.map((item) => (
                  <div key={item.commentId} className="rounded-(--radius-4) bg-bg-layer-default-hover p-3">
                    <div className="flex items-center justify-between">
                      <b className="type-body-small text-fg-neutral">{item.nickname}</b>
                      {item.mine && <button type="button" onClick={() => void removeComment(item)} className="text-xs text-fg-critical">삭제</button>}
                    </div>
                    <p className="mt-1 type-body-small text-fg-neutral-muted">{item.content}</p>
                  </div>
                ))}
              </div>
              {landing?.writable && (
                <div className="mt-4 flex gap-2">
                  <input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} placeholder="댓글" className="h-10 min-w-0 flex-1 rounded-(--radius-4) border border-stroke-neutral-muted bg-bg-layer-default px-3 text-fg-neutral" />
                  <Button size="sm" disabled={busy || !comment.trim()} onClick={() => void submitComment()}>등록</Button>
                </div>
              )}
            </>
          ) : (
            <p className="py-10 text-center type-body-medium text-fg-neutral-muted">사진을 선택하세요.</p>
          )}
        </aside>
      </main>
    </div>
  );
}

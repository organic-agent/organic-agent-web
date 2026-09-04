"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { listConceptFolders, type ConceptFolderResponse } from "@/lib/api/categories";
import {
  listCollabSessions,
  openCollabSession,
  republishCollabSession,
  revokeCollabSession,
  type CollabSessionResponse,
} from "@/lib/api/collab";
import { GalleryModalShell } from "../../_components/GalleryModalShell";

export function CollabSessionsModal({
  galleryId,
  onClose,
}: {
  galleryId: number;
  onClose: () => void;
}) {
  const [folders, setFolders] = useState<ConceptFolderResponse[]>([]);
  const [sessions, setSessions] = useState<CollabSessionResponse[] | null>(null);
  const [conceptFolderId, setConceptFolderId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listConceptFolders(galleryId), listCollabSessions(galleryId)])
      .then(([folderItems, sessionItems]) => {
        if (cancelled) return;
        setFolders(folderItems);
        setSessions(sessionItems);
        setConceptFolderId((current) => current ?? folderItems[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "공유 링크를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [galleryId]);

  async function create() {
    if (conceptFolderId === null || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await openCollabSession(galleryId, conceptFolderId, name.trim());
      setSessions((current) => [created, ...(current ?? []).filter((item) => item.sessionId !== created.sessionId)]);
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "공유 링크를 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function changeState(session: CollabSessionResponse) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (session.revoked) {
        const updated = await republishCollabSession(galleryId, session.sessionId);
        setSessions((current) => current?.map((item) => item.sessionId === updated.sessionId ? updated : item) ?? null);
      } else {
        await revokeCollabSession(galleryId, session.sessionId);
        setSessions((current) => current?.map((item) => item.sessionId === session.sessionId ? { ...item, revoked: true } : item) ?? null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "공유 링크 상태를 바꾸지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GalleryModalShell title="하객 공유 링크" desc="컨셉 카테고리의 현재 사진 구성을 동적으로 공유합니다." onClose={onClose}>
      <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={conceptFolderId ?? ""} onChange={(event) => setConceptFolderId(Number(event.target.value))} className="h-10 rounded-(--radius-4) border border-stroke-neutral-muted bg-bg-layer-default px-3 text-fg-neutral">
          <option value="" disabled>컨셉 선택</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="링크 이름" className="h-10 rounded-(--radius-4) border border-stroke-neutral-muted bg-bg-layer-default px-3 text-fg-neutral" />
        <Button disabled={busy || conceptFolderId === null || !name.trim()} onClick={() => void create()}>만들기</Button>
      </div>
      {error && <p role="alert" className="mb-4 type-body-small text-fg-critical">{error}</p>}
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {sessions?.map((session) => (
          <div key={session.sessionId} className="rounded-(--radius-8) border border-stroke-neutral-muted p-3">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate type-label-button text-fg-neutral">{session.name}</p>
                <p className="truncate type-body-small text-fg-neutral-muted">사진 {session.photoCount}장 · {session.revoked ? "폐기됨" : "활성"}</p>
              </div>
              {!session.revoked && <Button size="sm" kind="ghost" onClick={() => void navigator.clipboard.writeText(session.collabUrl)}>복사</Button>}
              <Button size="sm" kind="ghost" disabled={busy} onClick={() => void changeState(session)}>{session.revoked ? "재발행" : "폐기"}</Button>
            </div>
          </div>
        ))}
        {sessions?.length === 0 && <p className="py-6 text-center type-body-small text-fg-neutral-muted">아직 만든 공유 링크가 없습니다.</p>}
      </div>
    </GalleryModalShell>
  );
}

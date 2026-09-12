"use client";

/**
 * 게스트 초대 — 공유폴더를 골라 링크 하나로 · 만든 링크 관리 (설명글 없이, 2026-09-12 수민)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/InviteGuestsModal.tsx
 *
 * 링크 만들기: 사이드바 공유 탭에서 만든 공유폴더만 체크리스트로. 하나면 그 링크를 그대로, 여러 개면 사진을 겹침 없이
 * 모은 새 공유폴더(묶음)를 만들어 링크 하나를 준다(서버가 부분 집합 링크를 못 만들어서 — 사진은 만든 시점 고정).
 * 만든 링크: 이름 · 남은 기간 · 복사 · 재발행(7일 연장, 반응 보존) · 이름 바꾸기 · 폐기 · 폐기된 것은 다시 발행.
 */

import { useEffect, useRef, useState } from "react";
import { GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { CheckCircleIcon, CopyIcon, LinkIcon, PlusIcon, ShareIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { IconButton } from "@/components/ui/IconButton";
import { TextField } from "@/components/ui/TextField";
import { ApiError } from "@/lib/api/client";
import {
  listAllCollabPhotos,
  openManualCollabSession,
  renameCollabSession,
  republishCollabSession,
  revokeCollabSession,
  type CollabSessionResponse,
} from "@/lib/api/collab";
import { displayUrl, isLiveSession, sessionTermLabel, type CollabSessions } from "./useCollabSessions";

export type InviteTab = "new" | "list";

const modeLabel = (s: CollabSessionResponse) => (s.selectionMode === "CONCEPT_FOLDER" ? "컨셉 폴더 따라감" : "직접 담음");

function LinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setFailed(true);
    }
  }
  return (
    <div>
      <div className="flex h-11 items-center gap-1 rounded-(--radius-8) border border-border-default bg-surface-default-lightness pr-1 pl-3.5" title={url}>
        <span className="min-w-0 flex-1 truncate type-content-s text-contents-light-bgd-default tabular-nums">{displayUrl(url)}</span>
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
      {failed && (
        <p role="alert" className="mt-1.5 type-content-xs text-function-error-default">
          복사하지 못했어요 · 링크를 직접 선택해 복사해 주세요
        </p>
      )}
    </div>
  );
}

function Tag({ children, off = false }: { children: React.ReactNode; off?: boolean }) {
  return (
    <span className={`rounded-(--pill) px-2 py-0.5 type-label-semibold-xs ${off ? "bg-surface-default-light text-contents-light-bgd-sub" : "bg-brand-secondary-background text-brand-secondary-dark"}`}>{children}</span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-(--radius-12) border border-dashed border-border-default px-4 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-surface-default-lightness text-contents-light-bgd-sub">
        <ShareIcon size={22} />
      </span>
      <p className="type-label-semibold-s text-contents-light-bgd-default">아직 공유폴더가 없어요</p>
      <Button size="sm" onClick={onCreate} icon={<PlusIcon size={16} />}>
        새 공유폴더
      </Button>
    </div>
  );
}

const TEXT_LINK = "cursor-pointer type-content-xs underline underline-offset-2 disabled:cursor-not-allowed disabled:text-contents-light-bgd-disabled";

function SessionCard({
  galleryId,
  session,
  onChanged,
}: {
  galleryId: number;
  session: CollabSessionResponse;
  onChanged: () => Promise<unknown>;
}) {
  const term = sessionTermLabel(session);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(session.name);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [busy, setBusy] = useState<"rename" | "republish" | "revoke" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: NonNullable<typeof busy>, fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요 · 다시 시도해 주세요");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="flex flex-col gap-2.5 rounded-(--radius-12) border border-border-default p-3.5">
      <div className="flex items-start justify-between gap-2">
        {renaming ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const next = name.trim();
              if (!next || next === session.name) {
                setRenaming(false);
                setName(session.name);
                return;
              }
              void run("rename", () => renameCollabSession(galleryId, session.sessionId, { name: next })).then(() => setRenaming(false));
            }}
          >
            <TextField value={name} onChange={setName} aria-label="공유폴더 이름" className="h-8" />
            <Button size="sm" type="submit" disabled={busy === "rename"}>
              저장
            </Button>
            <Button
              size="sm"
              kind="ghost"
              onClick={() => {
                setRenaming(false);
                setName(session.name);
              }}
            >
              취소
            </Button>
          </form>
        ) : (
          <p className="min-w-0 flex-1 truncate type-label-semibold-m text-contents-light-bgd-default">{session.name}</p>
        )}
        {term.text && <Tag off={!term.live}>{term.text}</Tag>}
      </div>
      <p className="flex flex-wrap gap-x-2 type-content-xs text-contents-light-bgd-sub">
        <span>사진 {session.photoCount}</span>
        <span aria-hidden>·</span>
        <span>{modeLabel(session)}</span>
      </p>
      {term.live && <LinkBox url={session.collabUrl} />}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {term.live ? (
          confirmRevoke ? (
            <span className="flex items-center gap-2 type-content-xs text-contents-light-bgd-sub">
              전달한 링크가 바로 막혀요
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setConfirmRevoke(false);
                  void run("revoke", () => revokeCollabSession(galleryId, session.sessionId));
                }}
                className={`${TEXT_LINK} font-semibold text-function-error-default`}
              >
                폐기
              </button>
              <button type="button" onClick={() => setConfirmRevoke(false)} className={`${TEXT_LINK} text-contents-light-bgd-default`}>
                취소
              </button>
            </span>
          ) : (
            <>
              <button type="button" disabled={busy !== null} onClick={() => void run("republish", () => republishCollabSession(galleryId, session.sessionId))} className={`${TEXT_LINK} text-brand-secondary-dark`}>
                {busy === "republish" ? "재발행 중…" : "재발행 (7일 연장)"}
              </button>
              <button type="button" disabled={busy !== null || renaming} onClick={() => setRenaming(true)} className={`${TEXT_LINK} text-contents-light-bgd-default`}>
                이름 바꾸기
              </button>
              <button type="button" disabled={busy !== null} onClick={() => setConfirmRevoke(true)} className={`${TEXT_LINK} ml-auto text-function-error-default`}>
                폐기
              </button>
            </>
          )
        ) : (
          <button type="button" disabled={busy !== null} onClick={() => void run("republish", () => republishCollabSession(galleryId, session.sessionId))} className={`${TEXT_LINK} text-brand-secondary-dark`}>
            {busy === "republish" ? "발행 중…" : "다시 발행"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="type-content-xs text-function-error-default">
          {error}
        </p>
      )}
    </li>
  );
}

export function InviteGuestsModal({
  galleryId,
  collab,
  initialTab,
  onClose,
  onCreateShareFolder,
}: {
  galleryId: number;
  collab: CollabSessions;
  initialTab: InviteTab;
  onClose: () => void;
  /** "새 공유폴더" — 이 모달을 닫고 만들기 모달을 연다 */
  onCreateShareFolder: () => void;
}) {
  const [tab, setTab] = useState<InviteTab>(initialTab);
  const [chosen, setChosen] = useState<Set<number>>(() => new Set());
  const [linkName, setLinkName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ session: CollabSessionResponse; from: string[] } | null>(null);

  const sessions = collab.sessions;
  const live = (sessions ?? []).filter(isLiveSession);
  const chosenSessions = live.filter((s) => chosen.has(s.sessionId));
  const defaultLinkName = chosenSessions.map((s) => s.name).join(" + ");

  function toggle(id: number) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function makeLink() {
    if (busy || chosenSessions.length === 0) return;
    if (chosenSessions.length === 1) {
      setMade({ session: chosenSessions[0], from: [] });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const lists = await Promise.all(chosenSessions.map((s) => listAllCollabPhotos(galleryId, s.sessionId)));
      const photoIds = lists.flat().map((p) => p.photoId);
      const created = await openManualCollabSession(galleryId, { name: linkName.trim() || defaultLinkName }, photoIds);
      await collab.reload();
      setMade({ session: created, from: chosenSessions.map((s) => s.name) });
      setChosen(new Set());
      setLinkName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "링크를 만들지 못했어요 · 다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  }

  const tabs = (
    <div role="tablist" className="mt-2 mb-4 flex items-center gap-4 border-b border-divider-default">
      {(["new", "list"] as const).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() => {
            setTab(key);
            setMade(null);
          }}
          className={`shrink-0 cursor-pointer border-b-2 px-1 py-2 type-label-medium-m transition-colors duration-fast ${
            tab === key ? "border-contents-light-bgd-default text-contents-light-bgd-default" : "border-transparent text-contents-light-bgd-sub hover:text-contents-light-bgd-default"
          }`}
        >
          {key === "new" ? "링크 만들기" : `만든 링크${sessions ? ` ${sessions.length}` : ""}`}
        </button>
      ))}
    </div>
  );

  let body: React.ReactNode;
  if (sessions === null) {
    body = <div className="h-24 animate-pulse rounded-(--radius-8) bg-surface-default-light" aria-busy="true" />;
  } else if (made) {
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5 rounded-(--radius-12) border border-brand-secondary-default p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 truncate type-label-semibold-m text-contents-light-bgd-default">{made.session.name}</p>
            <Tag>{sessionTermLabel(made.session).text}</Tag>
          </div>
          <p className="type-content-xs text-contents-light-bgd-sub">
            사진 {made.session.photoCount}
            {made.from.length > 0 && ` · ${made.from.join(" + ")}`}
          </p>
          <LinkBox url={made.session.collabUrl} />
        </div>
        <div className="flex justify-end gap-2">
          <Button kind="ghost" onClick={() => setMade(null)} className="border border-border-default">
            하나 더 만들기
          </Button>
          <Button onClick={onClose}>닫기</Button>
        </div>
      </div>
    );
  } else if (tab === "new") {
    body =
      live.length === 0 ? (
        <EmptyState onCreate={onCreateShareFolder} />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-1 rounded-(--radius-12) bg-surface-default-lightness p-1.5" aria-label="공유폴더">
            {live.map((s) => (
              <li key={s.sessionId}>
                <label className={`flex cursor-pointer items-center gap-2.5 rounded-(--radius-8) px-2.5 py-2 transition-colors duration-fast hover:bg-surface-default-light ${chosen.has(s.sessionId) ? "bg-background-default-main shadow-[0_1px_2px_rgba(0,0,0,.06)]" : ""}`}>
                  <Checkbox checked={chosen.has(s.sessionId)} onChange={() => toggle(s.sessionId)} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate type-content-m text-contents-light-bgd-default">{s.name}</span>
                    <span className="type-content-xs text-contents-light-bgd-weakness">
                      {modeLabel(s)} · {sessionTermLabel(s).text}
                    </span>
                  </span>
                  <span className="shrink-0 type-content-xs text-contents-light-bgd-sub tabular-nums">{s.photoCount}장</span>
                </label>
              </li>
            ))}
          </ul>
          {chosenSessions.length >= 2 && (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 type-content-s text-contents-light-bgd-default">
                <span className="text-brand-secondary-dark">
                  <LinkIcon size={16} />
                </span>
                {chosenSessions.length}개를 묶어 <b>링크 하나</b>로
              </p>
              <TextField value={linkName} onChange={setLinkName} placeholder={defaultLinkName} aria-label="링크 이름" className="h-10" />
            </div>
          )}
          {error && (
            <p role="alert" className="type-content-xs text-function-error-default">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button kind="ghost" size="sm" onClick={onCreateShareFolder} icon={<PlusIcon size={16} />} className="border border-border-default">
              새 공유폴더
            </Button>
            <span className="flex-1" />
            <Button kind="ghost" onClick={onClose}>
              취소
            </Button>
            <Button onClick={() => void makeLink()} disabled={busy || chosenSessions.length === 0} icon={<LinkIcon size={18} />}>
              {busy ? "만드는 중…" : chosenSessions.length >= 2 ? "링크 하나로 만들기" : "링크 만들기"}
            </Button>
          </div>
        </div>
      );
  } else {
    const ordered = [...sessions].sort((a, b) => Number(isLiveSession(b)) - Number(isLiveSession(a)) || b.sessionId - a.sessionId);
    body =
      ordered.length === 0 ? (
        <EmptyState onCreate={onCreateShareFolder} />
      ) : (
        <ul className="scrollbar-slim flex max-h-[60dvh] flex-col gap-2 overflow-y-auto pr-0.5">
          {ordered.map((s) => (
            <SessionCard key={s.sessionId} galleryId={galleryId} session={s} onChanged={collab.reload} />
          ))}
        </ul>
      );
  }

  return (
    <GalleryModalShell title="게스트 초대" maxWidthClassName="max-w-140" onClose={onClose}>
      {sessions !== null && sessions.length > 0 && !made && tabs}
      {collab.error && sessions === null ? (
        <p role="alert" className="type-content-s text-function-error-default">
          공유폴더를 불러오지 못했어요
        </p>
      ) : (
        body
      )}
    </GalleryModalShell>
  );
}

"use client";

/**
 * 클라이언트에게 보내기 창(이슈 168 PR ③) — 보기만 / 수정 가능 중 하나를 고른다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/SendAlbumModal.tsx
 *
 * 시안 2판 3번 장면. 마지막에 고른 방식을 이 브라우저에 기억한다(처음은 보기만).
 * 서버가 생기기 전에는 이 브라우저의 앨범에 "보낸 앨범"을 담는 데까지 — 알림 · 잠금 · 돌려받기는 서버 뒤.
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";

type AlbumShareMode = "view" | "edit";

const MODE_KEY = "sel.album.sendMode";

function readMode(): AlbumShareMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === "edit" ? "edit" : "view";
  } catch {
    return "view";
  }
}

const OPTIONS: { key: AlbumShareMode; title: string; desc: string }[] = [
  { key: "view", title: "보기만", desc: "클라이언트는 앨범을 넘겨 보기만 해요" },
  { key: "edit", title: "수정 가능", desc: "사진 교체 · 위치 조정이 가능해요" },
];

export function SendAlbumModal({ summary, onClose, onSend }: { summary: string; onClose: () => void; onSend: (mode: AlbumShareMode) => void }) {
  const [mode, setMode] = useState<AlbumShareMode>(readMode);
  return (
    <GalleryModalShell title="앨범 구성을 클라이언트에게 보낼까요?" desc={summary} maxWidthClassName="max-w-130" onClose={onClose}>
      <div className="mb-6 flex flex-col gap-2" role="radiogroup" aria-label="보내는 방식">
        {OPTIONS.map((o) => {
          const on = mode === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(o.key)}
              className={`flex cursor-pointer items-start gap-3 rounded-(--radius-12) p-4 text-left transition-colors duration-fast ${
                on ? "border-2 border-brand-accent-default bg-brand-accent-surface" : "border border-border-default hover:bg-surface-default-lightness"
              }`}
            >
              <span aria-hidden className={`mt-0.5 size-4.5 shrink-0 rounded-full ${on ? "border-[5px] border-brand-accent-default" : "border-[1.5px] border-border-default"}`} />
              <span className="flex flex-col gap-0.5">
                <b className="type-label-semibold-m text-contents-light-bgd-default">{o.title}</b>
                <span className="type-content-s text-contents-light-bgd-sub">{o.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
      <GalleryModalButtons
        onClose={onClose}
        confirmLabel="보내기"
        onConfirm={() => {
          try {
            window.localStorage.setItem(MODE_KEY, mode);
          } catch {
            // 기억 못 해도 보내기는 된다
          }
          onSend(mode);
        }}
      />
    </GalleryModalShell>
  );
}

"use client";

/**
 * 앨범 만들기 창(이슈 168 PR ②) — 시작 방법 · 사이즈 · 페이지 수를 고르면 앨범을 만들고 편집기로 간다
 * 위치: src/app/(studio)/studio/gallery/[galleryId]/album/_album/CreateAlbumModal.tsx
 *
 * 갤러리 화면에서 "앨범 만들기"(사이드바 행 · 보정 확정 뒤 하단 버튼)를 누르면 그 화면 위에 뜬다. 화면보다 길면 창 안에서 스크롤한다.
 * - 시작: 빈 펼침면(프레임을 직접 그림) / 기본 틀(펼침면 24 · 프레임 34 — 페이지 수 · 선택 장수에 맞춰 자른다)
 * - 사이즈: 업계 인치 이름 + 한 쪽 mm. 직접 입력은 한 쪽 가로 × 세로 mm(100~500). 만든 뒤에는 바꾸지 않는다
 * - 페이지 수: 짝수(2~100) — 홀수를 적고 칸을 떠나면 하나 올린다
 * 배경 이미지는 서버가 생긴 뒤에 더한다(그때까지 흰 종이).
 */

import { useState } from "react";
import { GalleryModalButtons, GalleryModalShell } from "@/app/(studio)/studio/_components/GalleryModalShell";
import { ALBUM_SIZES, CUSTOM_MM, PAGE_COUNT, TEMPLATE_PAGES, indexFrames, startSpreads, type CreateOptions, type PageSize } from "@/lib/album/model";

type Start = CreateOptions["start"];

const FIELD =
  "h-10 rounded-(--radius-8) border bg-background-default-main px-3 type-content-m text-contents-light-bgd-default tabular-nums outline-none transition-colors duration-fast";
const fieldTone = (error: boolean) =>
  error ? "border-function-error-default ring-1 ring-function-error-default" : "border-border-default focus:border-contents-light-bgd-default focus:ring-1 focus:ring-contents-light-bgd-default";

const intOf = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);
const inRange = (n: number, r: { min: number; max: number }) => Number.isInteger(n) && n >= r.min && n <= r.max;

function Label({ children }: { children: string }) {
  return <span className="type-label-semibold-s text-contents-light-bgd-sub">{children}</span>;
}

export function CreateAlbumModal({
  selectedCount,
  onClose,
  onCreate,
}: {
  /** 클라이언트가 선택한 사진 수 — 프레임 상한 */
  selectedCount: number;
  onClose: () => void;
  /** 서버에 만들고 편집기로 — 만들지 못하면 false */
  onCreate: (opts: CreateOptions) => Promise<boolean>;
}) {
  const [start, setStart] = useState<Start>("blank");
  const [sizeKey, setSizeKey] = useState<string>(ALBUM_SIZES[2].name ?? "");
  const [customW, setCustomW] = useState("300");
  const [customH, setCustomH] = useState("300");
  const [pages, setPages] = useState("40");
  const [saveFailed, setSaveFailed] = useState(false);
  const [creating, setCreating] = useState(false);

  const custom = sizeKey === "custom";
  const cw = intOf(customW);
  const ch = intOf(customH);
  const customOk = { w: inRange(cw, CUSTOM_MM), h: inRange(ch, CUSTOM_MM) };
  const page: PageSize | null = custom ? (customOk.w && customOk.h ? { w: cw, h: ch, name: null } : null) : (ALBUM_SIZES.find((s) => s.name === sizeKey) ?? null);
  const pageCount = intOf(pages);
  const pagesOk = inRange(pageCount, PAGE_COUNT);
  const spreads = pagesOk ? Math.ceil(pageCount / 2) : null;
  // 기본 틀이 실제로 담을 펼침면 · 프레임(페이지 수 · 선택 장수에 맞춰 자른 뒤)
  const templatePages = start === "template" && spreads ? spreads * 2 : TEMPLATE_PAGES;
  const templateFrames = indexFrames(startSpreads({ start: "template", pages: templatePages, cap: selectedCount })).list.length;
  const ready = page !== null && spreads !== null;

  function pickStart(next: Start) {
    setStart(next);
    if (next === "template") setPages(String(TEMPLATE_PAGES));
  }

  async function create() {
    if (!page || !spreads || creating) return;
    setCreating(true);
    const ok = await onCreate({ start, page, pages: spreads * 2, cap: selectedCount });
    // 만들었으면 편집기로 넘어가며 창이 닫힌다
    if (!ok) {
      setCreating(false);
      setSaveFailed(true);
    }
  }

  return (
    <GalleryModalShell title="앨범 만들기" desc={`선택한 사진 ${selectedCount}장`} maxWidthClassName="max-w-140" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="시작">
          <Label>시작</Label>
          <div className="flex gap-2">
            {(
              [
                ["blank", "빈 펼침면", "프레임을 직접 그려요"],
                ["template", "기본 틀", `펼침면 ${templatePages / 2} · 프레임 ${templateFrames}`],
              ] as const
            ).map(([key, title, desc]) => {
              const on = start === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pickStart(key)}
                  className={`flex flex-1 cursor-pointer items-start gap-3 rounded-(--radius-12) p-3.5 text-left transition-colors duration-fast ${
                    on ? "border-2 border-brand-accent-default bg-brand-accent-surface" : "border border-border-default hover:bg-surface-default-lightness"
                  }`}
                >
                  <span aria-hidden className={`mt-0.5 size-4.5 shrink-0 rounded-full ${on ? "border-[5px] border-brand-accent-default" : "border-[1.5px] border-border-default"}`} />
                  <span className="flex flex-col gap-0.5">
                    <b className="type-label-semibold-m text-contents-light-bgd-default">{title}</b>
                    <span className="type-content-xs text-contents-light-bgd-sub">{desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2" role="radiogroup" aria-label="사이즈">
          <Label>사이즈</Label>
          <div className="grid grid-cols-5 gap-2 max-[520px]:grid-cols-3">
            {[...ALBUM_SIZES.map((s) => ({ key: s.name ?? "", title: s.name ?? "", sub: `${s.w} × ${s.h} mm` })), { key: "custom", title: "직접 입력", sub: "mm" }].map((c) => {
              const on = sizeKey === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSizeKey(c.key)}
                  className={`flex h-13 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-(--radius-8) px-1 transition-colors duration-fast ${
                    on ? "border-2 border-brand-accent-default bg-brand-accent-surface text-brand-accent-text" : "border border-border-default text-contents-light-bgd-default hover:bg-surface-default-lightness"
                  }`}
                >
                  <b className="type-label-semibold-s whitespace-nowrap">{c.title}</b>
                  <span className="type-content-xs whitespace-nowrap text-contents-light-bgd-weakness">{c.sub}</span>
                </button>
              );
            })}
          </div>
          {custom && (
            <div className="flex flex-wrap items-center gap-2 type-content-s text-contents-light-bgd-sub">
              한 쪽
              <input
                type="text"
                inputMode="numeric"
                aria-label="한 쪽 가로(mm)"
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                aria-invalid={!customOk.w || undefined}
                className={`${FIELD} w-21 ${fieldTone(!customOk.w)}`}
              />
              ×
              <input
                type="text"
                inputMode="numeric"
                aria-label="한 쪽 세로(mm)"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                aria-invalid={!customOk.h || undefined}
                className={`${FIELD} w-21 ${fieldTone(!customOk.h)}`}
              />
              mm
              {(!customOk.w || !customOk.h) && (
                <span className="type-content-xs text-function-error-default">
                  {CUSTOM_MM.min}~{CUSTOM_MM.max}mm
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>페이지 수</Label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              aria-label="페이지 수"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              onBlur={() => {
                if (pagesOk && pageCount % 2 === 1) setPages(String(Math.min(PAGE_COUNT.max, pageCount + 1)));
              }}
              aria-invalid={!pagesOk || undefined}
              className={`${FIELD} w-24 ${fieldTone(!pagesOk)}`}
            />
            {spreads ? (
              <span className="type-content-s text-contents-light-bgd-sub">펼침면 {spreads}</span>
            ) : (
              <span className="type-content-xs text-function-error-default">
                {PAGE_COUNT.min}~{PAGE_COUNT.max} 사이 짝수
              </span>
            )}
          </div>
        </div>

        {saveFailed && <p className="type-content-s text-function-error-default">앨범을 만들지 못했어요 · 다시 눌러 주세요</p>}
        <GalleryModalButtons onClose={onClose} onConfirm={() => void create()} confirmLabel="앨범 만들기" disabled={!ready || creating} />
      </div>
    </GalleryModalShell>
  );
}

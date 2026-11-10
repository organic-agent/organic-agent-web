/**
 * 앨범 모델 · 정책 로직(이슈 168) — 순수 함수만, 화면 · 저장과 무관
 * 위치: src/lib/album/model.ts
 *
 * 디자이너 프로토타입(photobook.html)을 React로 옮긴 photobook-react의 logic/album.ts를 가져와 우리 규칙으로 고쳤다.
 * - 앨범 전체 프레임을 (펼침면 → 펼침면 안 번호) 순서 하나로 본다. 사진 순번 = 이 순서에서의 순위
 * - 사진 1장 = 프레임 1개(중복 배치 없음)
 * - 사진을 누르면 "다음 배치 위치"(cursor)에 들어가고 다음 빈 프레임으로 넘어간다. 프레임을 고르면(manual) 그 자리에 넣거나 바꾼다
 * - 클라이언트가 선택에서 뺀 사진은 저절로 비우고 그 프레임을 "선택에서 빠짐"(gone)으로 표시한다 — 사진을 넣으면 표시가 사라진다
 * - 좌표는 페이지(한 쪽) 기준 0~1. 펼침면 = 왼쪽(p 0) + 오른쪽(p 1). 한 쪽의 실제 크기는 album.page(mm)
 * - 두 쪽에 걸친 프레임은 p 0에 x + w > 1로 담는다(펼침면 좌표 = p + x, 가로 0~2)
 * - 프레임 수는 클라이언트가 선택한 사진 수까지만(cap) — 단계별로 달라지는 규칙은 이슈 167에서
 * - 안내선은 화면에만 보이는 선(앨범에는 찍히지 않음), 위치 조정(crop)은 프레임 안 사진의 배율 · 위치
 *
 * 테스트(scripts/album-model.test.mjs)가 이 파일을 그대로 불러오므로 다른 모듈을 불러오지 않는다(타입만).
 */

export type Page = 0 | 1;

/** 저장되는 프레임 — 펼침면 배열에서의 순서가 곧 프레임 번호 */
export type FrameDef = { id: string; p: Page; x: number; y: number; w: number; h: number };

/** 펼침면 배경 글귀(기본 틀 장식) */
export type Deco = { p: Page; x: number; y: number; lines: string[] };

/** 펼침면 — id는 순서를 바꾸거나 지워도 그대로(안내선이 펼침면을 가리킬 때 쓴다) */
export type SpreadDef = { id: string; frames: FrameDef[]; deco: Deco | null };

/** 한 쪽 크기(mm) — name은 업계 인치 이름("12 × 12"), 직접 입력이면 null. 만든 뒤에는 바꾸지 않는다 */
export type PageSize = { w: number; h: number; name: string | null };

/** 안내선 — 세로선 pos는 펼침면 가로(0~2), 가로선 pos는 세로(0~1). scope는 "all" 또는 펼침면 id */
export type Guide = { id: string; dir: "h" | "v"; pos: number; scope: string };

/** 프레임 안 사진 위치 — s 배율(1 = 프레임을 꽉 채우는 최소), px · py 넘치는 쪽 중 보여 줄 자리(0~1). pid가 다르면(사진을 바꿨으면) 무시 */
export type Crop = { pid: number; s: number; px: number; py: number };

/** 펼침면 좌표의 사각형 — x 0~2(두 쪽), y 0~1 */
export type Rect = { x: number; y: number; w: number; h: number };

export type CursorMode = "auto" | "manual";

/** 되돌리기 대상이 되는 앨범 — 불변 객체로 다룬다 */
export type Album = {
  page: PageSize;
  spreads: SpreadDef[];
  guides: Guide[];
  /** 프레임 id → 사진 위치 */
  crop: Record<string, Crop>;
  /** 프레임 id → 사진 id */
  assign: Record<string, number>;
  /** 클라이언트가 선택에서 빼서 비운 프레임 id → 빠진 사진 id */
  gone: Record<string, number>;
  /** 다음 배치 위치(또는 스튜디오가 고른 프레임) */
  cursor: string | null;
  cursorMode: CursorMode;
  /** 지금 보는 펼침면 */
  spread: number;
};

/** 화면 · 정렬용으로 계산한 프레임 */
export type Frame = FrameDef & {
  spread: number;
  /** 펼침면 안 번호(1부터) */
  no: number;
  /** 앨범 전체 순서 */
  gi: number;
};

export type FrameIndex = {
  list: Frame[];
  byId: Record<string, Frame>;
  of: (spread: number) => Frame[];
};

// ── 기본 틀(프로토타입 그대로: 펼침면 24 · 프레임 34) ──

const LAYOUTS: Record<"A" | "D" | "E" | "F", { frames: Omit<FrameDef, "id">[]; deco: Deco | null }> = {
  A: {
    frames: [
      { p: 0, x: 0.08, y: 0.08, w: 0.84, h: 0.84 },
      { p: 1, x: 0.08, y: 0.08, w: 0.44, h: 0.84 },
      { p: 1, x: 0.56, y: 0.08, w: 0.38, h: 0.38 },
    ],
    deco: { p: 1, x: 0.56, y: 0.72, lines: ["Two hearts,", "one love"] },
  },
  D: {
    frames: [
      { p: 0, x: 0.08, y: 0.08, w: 0.84, h: 0.84 },
      { p: 1, x: 0.08, y: 0.08, w: 0.84, h: 0.84 },
    ],
    deco: null,
  },
  E: { frames: [{ p: 1, x: 0.08, y: 0.08, w: 0.84, h: 0.84 }], deco: { p: 0, x: 0.26, y: 0.4, lines: ["Our", "wedding day"] } },
  F: { frames: [{ p: 0, x: 0.08, y: 0.08, w: 0.84, h: 0.84 }], deco: { p: 1, x: 0.3, y: 0.4, lines: ["Forever", "& always"] } },
};

/** 펼침면별 프레임 수 — 합계 34 */
const TEMPLATE = [3, 2, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1];

/** 기본 틀 — 프레임 id는 펼침면 · 순서로 정해 두어 언제 만들어도 같다 */
export function defaultSpreads(): SpreadDef[] {
  let altE = false;
  return TEMPLATE.map((count, s) => {
    let layout = LAYOUTS.A;
    if (s > 0) {
      if (count === 2) layout = LAYOUTS.D;
      else {
        altE = !altE;
        layout = altE ? LAYOUTS.E : LAYOUTS.F;
      }
    }
    return {
      id: `sp${s + 1}`,
      frames: layout.frames.map((f, i) => ({ id: `s${s + 1}f${i + 1}`, ...f })),
      deco: layout.deco ? { ...layout.deco, lines: [...layout.deco.lines] } : null,
    };
  });
}

/** 앨범 사이즈 — 업계에서 인치 이름으로 부르고, 한 쪽 크기는 mm */
export const ALBUM_SIZES: readonly PageSize[] = [
  { name: "11 × 14", w: 279, h: 356 },
  { name: "14 × 11", w: 356, h: 279 },
  { name: "12 × 12", w: 305, h: 305 },
  { name: "13 × 10", w: 330, h: 254 },
];
export const DEFAULT_PAGE: PageSize = ALBUM_SIZES[2];
/** 직접 입력 범위(한 쪽 가로 · 세로 각각, mm) */
export const CUSTOM_MM = { min: 100, max: 500 } as const;
/** 페이지 수 범위(짝수) */
export const PAGE_COUNT = { min: 2, max: 100 } as const;
/** 기본 틀의 페이지 수(펼침면 24) */
export const TEMPLATE_PAGES = TEMPLATE.length * 2;

export type CreateOptions = {
  start: "blank" | "template";
  page: PageSize;
  /** 페이지 수(짝수) — 펼침면 = 절반 */
  pages: number;
  /** 프레임 상한(클라이언트가 선택한 사진 수) */
  cap: number;
};

/** 기본 틀을 페이지 수 · 상한에 맞춘 펼침면 — 펼침면이 남으면 빈 펼침면, 상한을 넘는 프레임은 뒤에서부터 뺀다 */
export function startSpreads(opts: Pick<CreateOptions, "start" | "pages" | "cap">): SpreadDef[] {
  const count = Math.max(1, Math.floor(opts.pages / 2));
  const template = opts.start === "template" ? defaultSpreads() : [];
  let left = Math.max(0, opts.cap);
  return Array.from({ length: count }, (_, i) => {
    const t = template[i];
    if (!t) return { id: `sp${i + 1}`, frames: [], deco: null };
    const frames = t.frames.slice(0, left);
    left -= frames.length;
    return { ...t, frames };
  });
}

export function createAlbum(opts: CreateOptions = { start: "template", page: DEFAULT_PAGE, pages: TEMPLATE_PAGES, cap: Infinity }): Album {
  const spreads = startSpreads(opts);
  const first = spreads.flatMap((s) => s.frames)[0];
  return { page: { ...opts.page }, spreads, guides: [], crop: {}, assign: {}, gone: {}, cursor: first?.id ?? null, cursorMode: "auto", spread: 0 };
}

/** 예전(PR ①) 저장본 보정 — 펼침면 id · 사이즈 · 안내선 · 위치가 없으면 채운다 */
export function normalizeAlbum(raw: Album): Album {
  const spreads = raw.spreads.map((sp, i) => (sp.id ? sp : { ...sp, id: `sp${i + 1}` }));
  return {
    ...raw,
    page: raw.page && raw.page.w > 0 && raw.page.h > 0 ? raw.page : { ...DEFAULT_PAGE },
    spreads,
    guides: Array.isArray(raw.guides) ? raw.guides : [],
    crop: raw.crop && typeof raw.crop === "object" ? raw.crop : {},
    gone: raw.gone ?? {},
  };
}

// ── 프레임 순서 ──

export function indexFrames(spreads: SpreadDef[]): FrameIndex {
  const list: Frame[] = [];
  spreads.forEach((sp, spread) => sp.frames.forEach((f, i) => list.push({ ...f, spread, no: i + 1, gi: list.length })));
  const byId: Record<string, Frame> = {};
  for (const f of list) byId[f.id] = f;
  return { list, byId, of: (s) => list.filter((f) => f.spread === s) };
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** 스낵바 · 배너에 쓰는 프레임 이름 — 지금 보는 펼침면이면 번호만("02"), 아니면 "펼침면 3의 02" */
export function frameLabel(f: Frame, currentSpread: number): string {
  return f.spread === currentSpread ? pad2(f.no) : `펼침면 ${f.spread + 1}의 ${pad2(f.no)}`;
}

/** 사진 id → 프레임 id */
export function photoFrame(album: Album): Record<number, string> {
  const m: Record<number, string> = {};
  for (const k in album.assign) m[album.assign[k]] = k;
  return m;
}

/** 배치 순번 = 프레임 순서 기준 1..N(패널 배지) */
export function ranks(album: Album, F: FrameIndex): Record<number, number> {
  const ids = Object.keys(album.assign)
    .filter((k) => F.byId[k])
    .sort((a, b) => F.byId[a].gi - F.byId[b].gi);
  const r: Record<number, number> = {};
  ids.forEach((k, i) => (r[album.assign[k]] = i + 1));
  return r;
}

export function placedCount(album: Album): number {
  return Object.keys(album.assign).length;
}

/** gi부터 앞으로, 끝까지 없으면 처음부터 gi 앞까지 — 첫 빈 프레임 */
export function nextEmptyFrom(album: Album, F: FrameIndex, gi: number): string | null {
  const L = F.list;
  for (let i = gi; i < L.length; i++) if (album.assign[L[i].id] === undefined) return L[i].id;
  for (let i = 0; i < Math.min(gi, L.length); i++) if (album.assign[L[i].id] === undefined) return L[i].id;
  return null;
}

export function spreadStartGi(F: FrameIndex, spread: number): number {
  const f = F.list.find((x) => x.spread >= spread);
  return f ? f.gi : 0;
}

export const withAutoCursor = (album: Album, F: FrameIndex, fromGi: number): Album => ({
  ...album,
  cursor: nextEmptyFrom(album, F, fromGi),
  cursorMode: "auto",
});

const withoutKey = <T>(rec: Record<string, T>, key: string): Record<string, T> => {
  if (!(key in rec)) return rec;
  const next = { ...rec };
  delete next[key];
  return next;
};

export type EditResult = {
  album: Album;
  /** 스낵바 문구 — 빈 문자열이면 띄우지 않는다 */
  toast: string;
  /** 지금 펼침면이 다 차서 넘어갈 펼침면 */
  navTo?: number;
};

/**
 * 아직 안 넣은 사진을 cursor 프레임에 넣는다. 고른 프레임(manual)에 사진이 있으면 확인 없이 바꾼다(되돌리기 스낵바).
 * cursor가 없으면(빈 프레임이 없음) null.
 */
export function placePhoto(album: Album, F: FrameIndex, photoId: number): EditResult | null {
  const cur = album.cursor;
  if (!cur || !F.byId[cur]) return null;
  const f = F.byId[cur];
  const prev = album.assign[cur];
  const base: Album = { ...album, assign: { ...album.assign, [cur]: photoId }, gone: withoutKey(album.gone, cur) };
  if (prev !== undefined) {
    return { album: withAutoCursor(base, F, spreadStartGi(F, album.spread)), toast: `${frameLabel(f, album.spread)} 프레임 사진을 바꿨어요` };
  }
  const next = withAutoCursor(base, F, f.gi + 1);
  const nxt = next.cursor ? F.byId[next.cursor] : null;
  // 넣은 프레임의 펼침면이 다 찼으면 다음 펼침면으로(지금 보는 펼침면과 다를 수 있다)
  const spreadFull = F.of(f.spread).every((x) => next.assign[x.id] !== undefined);
  if (nxt && nxt.spread !== f.spread && spreadFull) {
    return { album: next, toast: `펼침면 ${f.spread + 1} 완성 · 다음 펼침면으로 넘어갔어요`, navTo: nxt.spread };
  }
  return { album: next, toast: "" };
}

/** 이미 넣은 사진을 고른 프레임(to)으로 옮긴다 — 맞바꾸지 않고 원래 자리(from)는 비운다. 확인 창을 거친 뒤 부른다 */
export function movePhoto(album: Album, F: FrameIndex, photoId: number, from: string, to: string): EditResult {
  const other = album.assign[to];
  const assign = { ...album.assign, [to]: photoId };
  delete assign[from];
  const next = withAutoCursor({ ...album, assign, gone: withoutKey(album.gone, to) }, F, spreadStartGi(F, album.spread));
  const toL = frameLabel(F.byId[to], album.spread);
  const fromL = frameLabel(F.byId[from], album.spread);
  return {
    album: next,
    toast: other !== undefined ? `${toL} 프레임 사진을 바꿨어요 · ${fromL} 프레임은 비웠어요` : `사진을 ${toL} 프레임으로 옮겼어요 · ${fromL} 프레임은 비웠어요`,
  };
}

/** 프레임에서 사진을 뺀다 — 빈 자리가 다음 배치 위치 */
export function removePhoto(album: Album, F: FrameIndex, frameId: string): EditResult | null {
  if (album.assign[frameId] === undefined || !F.byId[frameId]) return null;
  const assign = withoutKey(album.assign, frameId);
  return {
    album: { ...album, assign, cursor: frameId, cursorMode: "auto" },
    toast: `${frameLabel(F.byId[frameId], album.spread)} 프레임에서 사진을 뺐어요`,
  };
}

/** 프레임 고르기 — 같은 프레임을 다시 누르면 고르기를 풀고 자동 위치로 */
export function selectFrame(album: Album, F: FrameIndex, frameId: string): Album {
  if (!F.byId[frameId]) return album;
  if (album.cursor === frameId && album.cursorMode === "manual") return withAutoCursor(album, F, spreadStartGi(F, album.spread));
  return { ...album, cursor: frameId, cursorMode: "manual" };
}

export function clearSelection(album: Album, F: FrameIndex): Album {
  if (album.cursorMode !== "manual") return album;
  return withAutoCursor(album, F, spreadStartGi(F, album.spread));
}

/** 펼침면 이동 — 고른 프레임이 있거나 커서가 다른 펼침면이면 이 펼침면 기준 첫 빈 프레임으로 */
export function goSpread(album: Album, F: FrameIndex, spread: number): Album {
  const s = Math.max(0, Math.min(album.spreads.length - 1, spread));
  if (s === album.spread) return album;
  const next = { ...album, spread: s };
  const c = album.cursor ? F.byId[album.cursor] : null;
  if (album.cursorMode === "manual" || !c || c.spread !== s) return withAutoCursor(next, F, spreadStartGi(F, s));
  return next;
}

/**
 * 클라이언트 선택과 맞춘다 — 선택에서 빠진 사진이 든 프레임을 비우고 "선택에서 빠짐"으로 표시한다.
 * 비운 프레임이 앞에 있으면 다음 배치 위치가 된다(지금 펼침면 기준 첫 빈 프레임). 바뀐 게 없으면 같은 객체를 돌려준다.
 */
export function syncSelection(album: Album, F: FrameIndex, selected: ReadonlySet<number>): { album: Album; removed: Frame[] } {
  const removed: Frame[] = [];
  let assign = album.assign;
  let gone = album.gone;
  for (const [frameId, photoId] of Object.entries(album.assign)) {
    if (selected.has(photoId)) continue;
    if (assign === album.assign) assign = { ...album.assign };
    if (gone === album.gone) gone = { ...album.gone };
    delete assign[frameId];
    gone[frameId] = photoId;
    if (F.byId[frameId]) removed.push(F.byId[frameId]);
  }
  if (removed.length === 0) return { album, removed };
  removed.sort((a, b) => a.gi - b.gi);
  const base = { ...album, assign, gone };
  const next = album.cursorMode === "manual" && album.cursor && assign[album.cursor] !== undefined ? base : withAutoCursor(base, F, spreadStartGi(F, album.spread));
  return { album: next, removed };
}

const sameRecord = (x: Record<string, number>, y: Record<string, number>) => {
  if (x === y) return true;
  const keys = Object.keys(x);
  return keys.length === Object.keys(y).length && keys.every((k) => x[k] === y[k]);
};

/** 저장할 내용이 같은지 — 보는 펼침면 · 다음 배치 위치는 저장거리가 아니다. 선택 맞추기가 새 객체를 만들어도 내용으로 비교한다 */
export function sameContent(a: Album, b: Album): boolean {
  return a.spreads === b.spreads && a.guides === b.guides && a.crop === b.crop && a.page === b.page && sameRecord(a.assign, b.assign) && sameRecord(a.gone, b.gone);
}

/** 선택에서 빠진 프레임이 있는 펼침면들 */
export function goneSpreads(album: Album, F: FrameIndex): Set<number> {
  const s = new Set<number>();
  for (const id of Object.keys(album.gone)) if (F.byId[id] && album.assign[id] === undefined) s.add(F.byId[id].spread);
  return s;
}

// ── 펼침면 좌표 · 프레임 편집(PR ②) ──

const r4 = (v: number) => Math.round(v * 10000) / 10000;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** 접힘 선을 넘는지 — 두 쪽에 걸친 프레임 */
export const crossesGutter = (f: Pick<FrameDef, "p" | "x" | "w">) => f.p === 0 && f.x + f.w > 1.0001;

export const rectOf = (f: Pick<FrameDef, "p" | "x" | "y" | "w" | "h">): Rect => ({ x: f.p + f.x, y: f.y, w: f.w, h: f.h });

/** 펼침면 좌표 → 저장 모양(오른쪽 쪽 안이면 p 1, 아니면 p 0 — 걸친 프레임 포함) */
export function frameOfRect(r: Rect): Omit<FrameDef, "id"> {
  const p: Page = r.x >= 0.9999 ? 1 : 0;
  return { p, x: r4(r.x - p), y: r4(r.y), w: r4(r.w), h: r4(r.h) };
}

/** 가장 작은 프레임(mm) */
export const MIN_FRAME_MM = 10;
export const minFrame = (page: PageSize) => ({ w: MIN_FRAME_MM / page.w, h: MIN_FRAME_MM / page.h });

/** 프레임 크기(mm) — 두 쪽에 걸쳐도 가로는 이어서 잰다 */
export const frameMm = (f: Pick<FrameDef, "w" | "h">, page: PageSize) => ({ w: Math.round(f.w * page.w), h: Math.round(f.h * page.h) });

/** 펼침면 안으로 밀어 넣기 */
export function fitRect(r: Rect): Rect {
  const w = clamp(r.w, 0, 2);
  const h = clamp(r.h, 0, 1);
  return { x: clamp(r.x, 0, 2 - w), y: clamp(r.y, 0, 1 - h), w, h };
}

/** 겹치지 않는 새 id — prefix + (쓰인 번호 중 가장 큰 것 + 1) */
function nextId(prefix: string, used: Iterable<string>): string {
  let max = 0;
  for (const id of used) {
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

const withSpreads = (album: Album, spreads: SpreadDef[]): Album => ({ ...album, spreads });

/** 지운 프레임들을 가리키는 배치 · 빠짐 · 위치를 정리 */
function dropFrameRefs(album: Album, ids: ReadonlySet<string>): Pick<Album, "assign" | "gone" | "crop"> {
  const keep = <T>(rec: Record<string, T>) => Object.fromEntries(Object.entries(rec).filter(([k]) => !ids.has(k)));
  return { assign: keep(album.assign), gone: keep(album.gone), crop: keep(album.crop) };
}

/** 지금 펼침면 끝에 프레임을 더한다(새 프레임을 고른 상태로). 상한에 닿았으면 null */
export function addFrame(album: Album, F: FrameIndex, rect: Rect, cap: number): EditResult | null {
  if (F.list.length >= cap) return null;
  const id = nextId("fr", F.list.map((f) => f.id));
  const frame: FrameDef = { id, ...frameOfRect(fitRect(rect)) };
  const spreads = album.spreads.map((sp, i) => (i === album.spread ? { ...sp, frames: [...sp.frames, frame] } : sp));
  const no = spreads[album.spread].frames.length;
  return { album: { ...withSpreads(album, spreads), cursor: id, cursorMode: "manual" }, toast: `${pad2(no)} 프레임을 더했어요` };
}

/** 프레임 자리 · 크기 바꾸기 */
export function setFrameRect(album: Album, frameId: string, rect: Rect): Album {
  const next = frameOfRect(fitRect(rect));
  let changed = false;
  const spreads = album.spreads.map((sp) => {
    if (!sp.frames.some((f) => f.id === frameId)) return sp;
    return {
      ...sp,
      frames: sp.frames.map((f) => {
        if (f.id !== frameId) return f;
        if (f.p === next.p && f.x === next.x && f.y === next.y && f.w === next.w && f.h === next.h) return f;
        changed = true;
        return { ...f, ...next };
      }),
    };
  });
  return changed ? withSpreads(album, spreads) : album;
}

/** 프레임 크기를 mm로 — 비율 고정이면 다른 쪽도 같은 배율로. 펼침면 밖으로 나가면 안으로 민다 */
export function resizeFrameMm(album: Album, F: FrameIndex, frameId: string, dim: "w" | "h", mm: number, lockRatio: boolean): Album {
  const f = F.byId[frameId];
  if (!f || !Number.isFinite(mm)) return album;
  const min = minFrame(album.page);
  const r = rectOf(f);
  let { w, h } = r;
  if (dim === "w") {
    const nw = clamp(mm / album.page.w, min.w, 2);
    if (lockRatio) h = clamp((h * nw) / w, min.h, 1);
    w = nw;
  } else {
    const nh = clamp(mm / album.page.h, min.h, 1);
    if (lockRatio) w = clamp((w * nh) / h, min.w, 2);
    h = nh;
  }
  return setFrameRect(album, frameId, { x: r.x, y: r.y, w, h });
}

/** 프레임 지우기 — 들어 있던 사진은 패널로 돌아가고 번호는 다시 매겨진다 */
export function deleteFrame(album: Album, F: FrameIndex, frameId: string): EditResult | null {
  const f = F.byId[frameId];
  if (!f) return null;
  const hadPhoto = album.assign[frameId] !== undefined;
  const spreads = album.spreads.map((sp, i) => (i === f.spread ? { ...sp, frames: sp.frames.filter((x) => x.id !== frameId) } : sp));
  const base: Album = { ...withSpreads(album, spreads), ...dropFrameRefs(album, new Set([frameId])) };
  const nF = indexFrames(spreads);
  return {
    album: withAutoCursor(base, nF, spreadStartGi(nF, album.spread)),
    toast: `${frameLabel(f, album.spread)} 프레임을 지웠어요${hadPhoto ? " · 사진은 패널로 돌아갔어요" : ""}`,
  };
}

// ── 펼침면 관리 ──

/** 끝에 빈 펼침면을 더하고 그 펼침면으로 */
export function addSpread(album: Album): EditResult {
  const id = nextId("sp", album.spreads.map((s) => s.id));
  const spreads = [...album.spreads, { id, frames: [], deco: null }];
  const nF = indexFrames(spreads);
  const spread = spreads.length - 1;
  return { album: withAutoCursor({ ...withSpreads(album, spreads), spread }, nF, spreadStartGi(nF, spread)), toast: `펼침면 ${spreads.length}을 더했어요` };
}

/** 펼침면 지우기 — 마지막 한 장은 못 지운다. 들어 있던 사진은 패널로, 그 펼침면에만 둔 안내선도 지운다 */
export function deleteSpread(album: Album, index: number): EditResult | null {
  if (album.spreads.length <= 1 || !album.spreads[index]) return null;
  const target = album.spreads[index];
  const ids = new Set(target.frames.map((f) => f.id));
  const photos = target.frames.filter((f) => album.assign[f.id] !== undefined).length;
  const spreads = album.spreads.filter((_, i) => i !== index);
  const spread = album.spread > index ? album.spread - 1 : Math.min(album.spread, spreads.length - 1);
  const base: Album = {
    ...withSpreads(album, spreads),
    ...dropFrameRefs(album, ids),
    guides: album.guides.filter((g) => g.scope !== target.id),
    spread,
  };
  const nF = indexFrames(spreads);
  return {
    album: withAutoCursor(base, nF, spreadStartGi(nF, spread)),
    toast: `펼침면 ${index + 1}을 지웠어요${photos ? ` · 사진 ${photos}장은 패널로 돌아갔어요` : ""}`,
  };
}

/** 펼침면 순서 바꾸기 — before는 옮기기 전 배열에서 "이 펼침면 앞에"(끝이면 length). 보던 펼침면은 따라간다 */
export function moveSpread(album: Album, from: number, before: number): EditResult | null {
  const n = album.spreads.length;
  if (from < 0 || from >= n || before < 0 || before > n) return null;
  const to = before > from ? before - 1 : before;
  if (to === from) return null;
  const spreads = [...album.spreads];
  const [moved] = spreads.splice(from, 1);
  spreads.splice(to, 0, moved);
  const viewing = album.spreads[album.spread]?.id;
  const spread = Math.max(0, spreads.findIndex((s) => s.id === viewing));
  const nF = indexFrames(spreads);
  return { album: withAutoCursor({ ...withSpreads(album, spreads), spread }, nF, spreadStartGi(nF, spread)), toast: `펼침면 ${from + 1}을 ${to + 1}번째로 옮겼어요` };
}

// ── 안내선 ──

/** 지금 펼침면에 보이는 안내선 */
export function visibleGuides(album: Album): Guide[] {
  const id = album.spreads[album.spread]?.id;
  return album.guides.filter((g) => g.scope === "all" || g.scope === id);
}

/** 안내선 더하기 — all이면 모든 펼침면에, 아니면 지금 펼침면에만 */
export function addGuide(album: Album, dir: Guide["dir"], pos: number, all: boolean): Album {
  const id = nextId("gd", album.guides.map((g) => g.id));
  const scope = all ? "all" : (album.spreads[album.spread]?.id ?? "all");
  return { ...album, guides: [...album.guides, { id, dir, pos: r4(clamp(pos, 0, dir === "v" ? 2 : 1)), scope }] };
}

export function moveGuide(album: Album, guideId: string, pos: number): Album {
  return { ...album, guides: album.guides.map((g) => (g.id === guideId ? { ...g, pos: r4(clamp(pos, 0, g.dir === "v" ? 2 : 1)) } : g)) };
}

export function removeGuide(album: Album, guideId: string): Album {
  return { ...album, guides: album.guides.filter((g) => g.id !== guideId) };
}

// ── 맞붙기(프레임 그리기 · 옮기기 · 크기) ──

/** 맞붙을 선 — 쪽 가장자리 · 가운데 · 접힘, 안내선, 같은 펼침면 다른 프레임의 가장자리 */
export function snapLines(axis: "x" | "y", guides: Guide[], frames: Frame[], excludeId?: string): number[] {
  const out = axis === "x" ? [0, 0.5, 1, 1.5, 2] : [0, 0.5, 1];
  for (const g of guides) if ((axis === "x") === (g.dir === "v")) out.push(g.pos);
  for (const f of frames) {
    if (f.id === excludeId) continue;
    const r = rectOf(f);
    if (axis === "x") out.push(r.x, r.x + r.w);
    else out.push(r.y, r.y + r.h);
  }
  return out;
}

export function snapEdge(v: number, lines: number[], tol: number): number {
  let best = v;
  let bd = tol;
  for (const l of lines) {
    const d = Math.abs(l - v);
    if (d < bd) {
      bd = d;
      best = l;
    }
  }
  return best;
}

/** 옮기기 — 시작 · 끝 가장자리 중 가까운 쪽을 맞붙인 시작 자리 */
export function snapSpan(start: number, size: number, lines: number[], tol: number): number {
  let best = start;
  let bd = tol;
  for (const l of lines) {
    for (const [v, off] of [
      [start, 0],
      [start + size, size],
    ] as const) {
      const d = Math.abs(l - v);
      if (d < bd) {
        bd = d;
        best = l - off;
      }
    }
  }
  return best;
}

// ── 위치 조정(프레임 안 사진) ──

export const CROP_MIN = 1;
export const CROP_MAX = 4;

/** 지금 사진의 위치 — 없거나 다른 사진의 것이면 기본(꽉 채워 가운데) */
export function getCrop(album: Album, frameId: string): Crop | null {
  const pid = album.assign[frameId];
  if (pid === undefined) return null;
  const c = album.crop[frameId];
  return c && c.pid === pid ? c : { pid, s: 1, px: 0.5, py: 0.5 };
}

export const isDefaultCrop = (c: Crop) => c.s === 1 && c.px === 0.5 && c.py === 0.5;

/** 위치 저장 — 기본값이면 지운다 */
export function setCrop(album: Album, frameId: string, c: Crop): Album {
  const cur = album.crop[frameId];
  if (isDefaultCrop(c)) {
    if (!cur) return album;
    const crop = { ...album.crop };
    delete crop[frameId];
    return { ...album, crop };
  }
  const next = { pid: c.pid, s: r4(c.s), px: r4(c.px), py: r4(c.py) };
  if (cur && cur.pid === next.pid && cur.s === next.s && cur.px === next.px && cur.py === next.py) return album;
  return { ...album, crop: { ...album.crop, [frameId]: next } };
}

/** 사진이 프레임 기준으로 차지하는 사각형(%) — frameAR · photoAR은 가로/세로 */
export function cropRect(c: Crop, frameAR: number, photoAR: number) {
  let w = 100;
  let h = 100;
  if (photoAR > frameAR) w = (photoAR / frameAR) * 100;
  else h = (frameAR / photoAR) * 100;
  w *= c.s;
  h *= c.s;
  return { l: (100 - w) * c.px, t: (100 - h) * c.py, w, h };
}

/** 사진 가운데를 지킨 채 배율 바꾸기 */
export function scaleCrop(c: Crop, s: number, frameAR: number, photoAR: number): Crop {
  const r0 = cropRect(c, frameAR, photoAR);
  const cx = r0.l + r0.w / 2;
  const cy = r0.t + r0.h / 2;
  const next = { ...c, s: clamp(s, CROP_MIN, CROP_MAX) };
  const r = cropRect(next, frameAR, photoAR);
  next.px = Math.abs(100 - r.w) < 0.01 ? 0.5 : clamp((cx - r.w / 2) / (100 - r.w), 0, 1);
  next.py = Math.abs(100 - r.h) < 0.01 ? 0.5 : clamp((cy - r.h / 2) / (100 - r.h), 0, 1);
  return next;
}

/** 프레임 기준 %만큼 사진 옮기기 */
export function panCrop(c: Crop, dxPct: number, dyPct: number, frameAR: number, photoAR: number): Crop {
  const r = cropRect(c, frameAR, photoAR);
  const next = { ...c };
  if (Math.abs(100 - r.w) > 0.01) next.px = clamp(c.px + dxPct / (100 - r.w), 0, 1);
  if (Math.abs(100 - r.h) > 0.01) next.py = clamp(c.py + dyPct / (100 - r.h), 0, 1);
  return next;
}

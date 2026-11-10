/**
 * 앨범 모델 · 정책 로직(이슈 168) — 순수 함수만, 화면 · 저장과 무관
 * 위치: src/lib/album/model.ts
 *
 * 디자이너 프로토타입(photobook.html)을 React로 옮긴 photobook-react의 logic/album.ts를 가져와 우리 규칙으로 고쳤다.
 * - 앨범 전체 프레임을 (펼침면 → 펼침면 안 번호) 순서 하나로 본다. 사진 순번 = 이 순서에서의 순위
 * - 사진 1장 = 프레임 1개(중복 배치 없음)
 * - 사진을 누르면 "다음 배치 위치"(cursor)에 들어가고 다음 빈 프레임으로 넘어간다. 프레임을 고르면(manual) 그 자리에 넣거나 바꾼다
 * - 클라이언트가 선택에서 뺀 사진은 저절로 비우고 그 프레임을 "선택에서 빠짐"(gone)으로 표시한다 — 사진을 넣으면 표시가 사라진다
 * - 좌표는 페이지(정사각형 한 면) 기준 0~1. 펼침면 = 왼쪽(p 0) + 오른쪽(p 1)
 * 위치 조정(크롭) · 프레임 · 안내선 도구는 PR ②에서 더한다(그때까지 사진은 프레임을 꽉 채운다).
 *
 * 테스트(scripts/album-model.test.mjs)가 이 파일을 그대로 불러오므로 다른 모듈을 불러오지 않는다(타입만).
 */

export type Page = 0 | 1;

/** 저장되는 프레임 — 펼침면 배열에서의 순서가 곧 프레임 번호 */
export type FrameDef = { id: string; p: Page; x: number; y: number; w: number; h: number };

/** 펼침면 배경 글귀(기본 틀 장식) */
export type Deco = { p: Page; x: number; y: number; lines: string[] };

export type SpreadDef = { frames: FrameDef[]; deco: Deco | null };

export type CursorMode = "auto" | "manual";

/** 되돌리기 대상이 되는 앨범 — 불변 객체로 다룬다 */
export type Album = {
  spreads: SpreadDef[];
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
      frames: layout.frames.map((f, i) => ({ id: `s${s + 1}f${i + 1}`, ...f })),
      deco: layout.deco ? { ...layout.deco, lines: [...layout.deco.lines] } : null,
    };
  });
}

export function createAlbum(): Album {
  const spreads = defaultSpreads();
  return { spreads, assign: {}, gone: {}, cursor: spreads[0]?.frames[0]?.id ?? null, cursorMode: "auto", spread: 0 };
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
  const spreadFull = F.of(album.spread).every((x) => next.assign[x.id] !== undefined);
  if (nxt && nxt.spread !== album.spread && spreadFull) {
    return { album: next, toast: `펼침면 ${album.spread + 1} 완성 · 다음 펼침면으로 넘어갔어요`, navTo: nxt.spread };
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

/** 선택에서 빠진 프레임이 있는 펼침면들 */
export function goneSpreads(album: Album, F: FrameIndex): Set<number> {
  const s = new Set<number>();
  for (const id of Object.keys(album.gone)) if (F.byId[id] && album.assign[id] === undefined) s.add(F.byId[id].spread);
  return s;
}

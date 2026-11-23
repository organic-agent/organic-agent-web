import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// 앨범 정책 로직(이슈 168) — 다른 테스트처럼 타입스크립트 소스를 바로 옮겨 불러온다
const load = async (path) => {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
};
const M = await load("../src/lib/album/model.ts");

const fresh = () => {
  const album = M.createAlbum();
  return { album, F: M.indexFrames(album.spreads) };
};
/** 사진을 차례로 넣는다 */
const placeAll = (album, F, ids) => {
  let a = album;
  for (const id of ids) a = M.placePhoto(a, F, id).album;
  return a;
};

test("기본 틀은 펼침면 24 · 프레임 34, 첫 프레임이 다음 배치 위치", () => {
  const { album, F } = fresh();
  assert.equal(album.spreads.length, 24);
  assert.equal(F.list.length, 34);
  assert.equal(album.cursor, "s1f1");
  assert.equal(album.cursorMode, "auto");
  assert.deepEqual(M.defaultSpreads(), M.defaultSpreads()); // 언제 만들어도 같은 id
});

test("사진을 넣으면 다음 빈 프레임으로 넘어가고, 펼침면이 다 차면 다음 펼침면으로 간다", () => {
  const { album, F } = fresh();
  let r = M.placePhoto(album, F, 101);
  assert.equal(r.album.assign.s1f1, 101);
  assert.equal(r.album.cursor, "s1f2");
  assert.equal(r.toast, "");
  r = M.placePhoto(r.album, F, 102);
  r = M.placePhoto(r.album, F, 103);
  assert.equal(r.navTo, 1);
  assert.equal(r.album.cursor, "s2f1");
  assert.match(r.toast, /펼침면 1 완성/);
});

test("고른 프레임에 사진이 있으면 확인 없이 바꾸고 스낵바 문구를 준다", () => {
  const { album, F } = fresh();
  let a = placeAll(album, F, [101, 102]);
  a = M.selectFrame(a, F, "s1f1");
  assert.equal(a.cursorMode, "manual");
  const r = M.placePhoto(a, F, 200);
  assert.equal(r.album.assign.s1f1, 200);
  assert.equal(r.album.cursorMode, "auto");
  assert.equal(r.toast, "01 프레임 사진을 바꿨어요");
});

test("이미 넣은 사진을 옮기면 원래 자리는 비고(맞바꾸지 않음) 사진은 한 곳에만 있다", () => {
  const { album, F } = fresh();
  let a = placeAll(album, F, [101, 102]);
  a = M.selectFrame(a, F, "s1f3");
  const r = M.movePhoto(a, F, 101, "s1f1", "s1f3");
  assert.equal(r.album.assign.s1f3, 101);
  assert.equal(r.album.assign.s1f1, undefined);
  assert.equal(Object.values(r.album.assign).filter((v) => v === 101).length, 1);
  assert.equal(r.album.cursor, "s1f1"); // 비운 자리가 다음 배치 위치
  assert.equal(r.toast, "사진을 03 프레임으로 옮겼어요 · 01 프레임은 비웠어요");
});

test("사진을 빼면 그 자리가 다음 배치 위치", () => {
  const { album, F } = fresh();
  const a = placeAll(album, F, [101, 102, 103]);
  const r = M.removePhoto(a, F, "s1f2");
  assert.equal(r.album.assign.s1f2, undefined);
  assert.equal(r.album.cursor, "s1f2");
  assert.equal(M.removePhoto(r.album, F, "s1f2"), null);
});

test("배치 순번은 프레임 순서 기준 1..N", () => {
  const { album, F } = fresh();
  let a = placeAll(album, F, [101, 102, 103, 104]);
  a = M.removePhoto(a, F, "s1f1").album;
  assert.deepEqual(M.ranks(a, F), { 102: 1, 103: 2, 104: 3 });
});

test("선택에서 빠진 사진은 저절로 비우고 gone으로 표시, 그 자리가 다음 배치 위치", () => {
  const { album, F } = fresh();
  const a = placeAll(album, F, [101, 102, 103]);
  const { album: b, removed } = M.syncSelection(a, F, new Set([101, 103, 104]));
  assert.deepEqual(removed.map((f) => f.id), ["s1f2"]);
  assert.equal(b.assign.s1f2, undefined);
  assert.equal(b.gone.s1f2, 102);
  assert.equal(b.cursor, "s1f2");
  assert.deepEqual([...M.goneSpreads(b, F)], [0]);
  // 바뀐 게 없으면 같은 객체
  assert.equal(M.syncSelection(b, F, new Set([101, 103])).album, b);
  // 그 자리에 사진을 넣으면 표시가 사라진다
  const c = M.placePhoto(b, F, 104).album;
  assert.equal(c.gone.s1f2, undefined);
  assert.equal(M.goneSpreads(c, F).size, 0);
});

test("보는 펼침면과 다른 펼침면을 다 채워도 그 펼침면 번호로 알리고 넘어간다", () => {
  const { album, F } = fresh();
  let a = placeAll(album, F, [101, 102, 103, 104]); // 펼침면 2의 첫 칸까지
  a = { ...a, spread: 0 };
  const r = M.placePhoto(a, F, 105);
  assert.equal(r.navTo, 2);
  assert.match(r.toast, /펼침면 2 완성/);
});

test("펼침면 이동 · 커서만 바뀌면 저장거리가 아니다", () => {
  const { album, F } = fresh();
  const a = placeAll(album, F, [101]);
  assert.equal(M.sameContent(a, M.goSpread(a, F, 3)), true);
  assert.equal(M.sameContent(a, M.selectFrame(a, F, "s1f1")), true);
  assert.equal(M.sameContent(a, M.placePhoto(a, F, 102).album), false);
  // 선택 맞추기를 다시 해도(새 객체) 내용이 같으면 같다
  const b = placeAll(album, F, [101, 102]);
  const once = M.syncSelection(b, F, new Set([101])).album;
  const twice = M.syncSelection(b, F, new Set([101])).album;
  assert.notEqual(once, twice);
  assert.equal(M.sameContent(once, twice), true);
});

test("다른 펼침면 프레임 이름은 펼침면을 붙인다", () => {
  const { album, F } = fresh();
  const f = F.byId.s3f1;
  assert.equal(M.frameLabel(f, 0), "펼침면 3의 01");
  assert.equal(M.frameLabel(f, 2), "01");
  const moved = M.goSpread(album, F, 2);
  assert.equal(moved.spread, 2);
  assert.equal(moved.cursor, "s3f1");
});

// ── PR ② 사이즈 · 프레임 · 펼침면 · 안내선 · 위치 조정 ──

const blank = (pages = 6, cap = 3) => {
  const album = M.createAlbum({ start: "blank", page: { w: 305, h: 305, name: "12 × 12" }, pages, cap });
  return { album, F: M.indexFrames(album.spreads) };
};

test("빈 펼침면으로 만들면 페이지 수의 절반만큼 빈 펼침면, 기본 틀은 상한을 넘는 프레임을 뺀다", () => {
  const { album, F } = blank(6);
  assert.equal(album.spreads.length, 3);
  assert.equal(F.list.length, 0);
  assert.equal(album.cursor, null);
  assert.deepEqual(album.spreads.map((s) => s.id), ["sp1", "sp2", "sp3"]);
  const t = M.createAlbum({ start: "template", page: M.DEFAULT_PAGE, pages: 60, cap: 10 });
  assert.equal(t.spreads.length, 30);
  assert.equal(M.indexFrames(t.spreads).list.length, 10);
  assert.equal(t.spreads[29].frames.length, 0);
});

test("프레임은 상한(선택 장수)까지만 더해지고, 새 프레임을 고른 상태가 된다", () => {
  let { album, F } = blank(4, 2);
  let r = M.addFrame(album, F, { x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, 2);
  assert.equal(r.album.cursor, "fr1");
  assert.equal(r.album.cursorMode, "manual");
  assert.equal(r.toast, "01 프레임을 더했어요");
  album = r.album;
  F = M.indexFrames(album.spreads);
  r = M.addFrame(album, F, { x: 1.1, y: 0.1, w: 0.5, h: 0.5 }, 2);
  assert.equal(r.album.spreads[0].frames[1].p, 1);
  album = r.album;
  F = M.indexFrames(album.spreads);
  assert.equal(M.addFrame(album, F, { x: 0.1, y: 0.6, w: 0.2, h: 0.2 }, 2), null);
});

test("두 쪽에 걸친 프레임은 p 0에 x + w > 1로 담기고 펼침면 밖으로는 못 나간다", () => {
  const { album, F } = blank();
  const r = M.addFrame(album, F, { x: 0.6, y: 0.1, w: 0.8, h: 0.5 }, 3);
  const f = r.album.spreads[0].frames[0];
  assert.deepEqual({ p: f.p, x: f.x, w: f.w }, { p: 0, x: 0.6, w: 0.8 });
  assert.equal(M.crossesGutter(f), true);
  const moved = M.setFrameRect(r.album, f.id, { x: 1.8, y: 0.8, w: 0.8, h: 0.5 });
  const g = moved.spreads[0].frames[0];
  assert.deepEqual(M.rectOf(g), { x: 1.2, y: 0.5, w: 0.8, h: 0.5 });
  assert.equal(g.p, 1);
  assert.equal(M.crossesGutter(g), false);
});

test("프레임을 지우면 사진은 패널로 돌아가고 번호가 다시 매겨진다", () => {
  let { album, F } = blank();
  for (const x of [0.05, 0.4, 1.1]) {
    album = M.addFrame(album, F, { x, y: 0.1, w: 0.3, h: 0.3 }, 3).album;
    F = M.indexFrames(album.spreads);
  }
  album = M.placePhoto(M.clearSelection(album, F), F, 7).album;
  assert.equal(album.assign.fr1, 7);
  const r = M.deleteFrame(album, F, "fr1");
  assert.equal(r.album.assign.fr1, undefined);
  assert.match(r.toast, /01 프레임을 지웠어요 · 사진은 패널로 돌아갔어요/);
  const nF = M.indexFrames(r.album.spreads);
  assert.equal(nF.byId.fr2.no, 1);
});

test("mm로 크기를 바꾸면 비율 고정이면 다른 쪽도 같은 배율", () => {
  let { album, F } = blank();
  album = M.addFrame(album, F, { x: 0.1, y: 0.1, w: 0.4, h: 0.2 }, 3).album;
  F = M.indexFrames(album.spreads);
  const a = M.resizeFrameMm(album, F, "fr1", "w", 244, true);
  const f = a.spreads[0].frames[0];
  assert.deepEqual(M.frameMm(f, album.page), { w: 244, h: 122 });
  const b = M.resizeFrameMm(album, F, "fr1", "h", 5, false);
  assert.equal(M.frameMm(b.spreads[0].frames[0], album.page).h, 10); // 가장 작은 프레임 10mm
});

test("펼침면 더하기 · 지우기 · 순서 바꾸기", () => {
  let { album } = blank(4);
  let r = M.addSpread(album);
  assert.equal(r.album.spreads.length, 3);
  assert.equal(r.album.spread, 2);
  assert.equal(r.album.spreads[2].id, "sp3");
  album = { ...r.album, spread: 0 };
  // sp1을 맨 끝으로 — 보던 펼침면이 따라간다
  r = M.moveSpread(album, 0, 3);
  assert.deepEqual(r.album.spreads.map((s) => s.id), ["sp2", "sp3", "sp1"]);
  assert.equal(r.album.spread, 2);
  assert.equal(M.moveSpread(album, 1, 1), null);
  assert.equal(M.moveSpread(album, 1, 2), null);
  // 사진이 든 펼침면 지우기 — 사진 · 그 펼침면 안내선 정리
  let F = M.indexFrames(album.spreads);
  album = M.addFrame(album, F, { x: 0.1, y: 0.1, w: 0.3, h: 0.3 }, 3).album;
  F = M.indexFrames(album.spreads);
  album = M.placePhoto(M.clearSelection(album, F), F, 9).album;
  album = M.addGuide(album, "h", 0.5, false);
  album = M.addGuide(album, "v", 1.5, true);
  const d = M.deleteSpread(album, 0);
  assert.equal(d.album.spreads.length, 2);
  assert.deepEqual(d.album.assign, {});
  assert.deepEqual(d.album.guides.map((g) => g.scope), ["all"]);
  assert.match(d.toast, /사진 1장은 패널로/);
  assert.equal(M.deleteSpread({ ...album, spreads: [album.spreads[0]] }, 0), null);
});

test("안내선은 전체 또는 그 펼침면에만 보인다", () => {
  let { album } = blank(4);
  album = M.addGuide(album, "v", 0.7, false);
  album = M.addGuide(album, "h", 0.3, true);
  assert.equal(M.visibleGuides(album).length, 2);
  assert.equal(M.visibleGuides({ ...album, spread: 1 }).length, 1);
  album = M.moveGuide(album, "gd1", 5);
  assert.equal(album.guides[0].pos, 2);
  assert.equal(M.removeGuide(album, "gd1").guides.length, 1);
});

test("맞붙기 — 가까운 선으로, 옮길 때는 가까운 가장자리로", () => {
  const lines = M.snapLines("x", [{ id: "g", dir: "v", pos: 0.7, scope: "all" }], []);
  assert.ok(lines.includes(1) && lines.includes(0.7));
  assert.equal(M.snapEdge(0.98, lines, 0.03), 1);
  assert.equal(M.snapEdge(0.9, lines, 0.03), 0.9);
  assert.ok(Math.abs(M.snapSpan(0.42, 0.3, lines, 0.03) - 0.4) < 1e-9); // 끝(0.72)이 0.7에 붙는다
});

test("위치 조정 — 사진을 바꾸면 무시, 기본값이면 지우고 배율을 바꿔도 가운데를 지킨다", () => {
  let { album, F } = blank();
  album = M.addFrame(album, F, { x: 0.1, y: 0.1, w: 0.4, h: 0.4 }, 3).album;
  F = M.indexFrames(album.spreads);
  album = M.placePhoto(album, F, 5).album;
  assert.deepEqual(M.getCrop(album, "fr1"), { pid: 5, s: 1, px: 0.5, py: 0.5 });
  const c = M.scaleCrop(M.getCrop(album, "fr1"), 2, 1, 1.5);
  assert.equal(c.s, 2);
  assert.ok(Math.abs(c.px - 0.5) < 1e-9);
  const moved = M.panCrop(c, 10, 0, 1, 1.5);
  assert.ok(moved.px < 0.5); // 사진을 오른쪽으로 옮기면 왼쪽이 더 보인다
  album = M.setCrop(album, "fr1", moved);
  assert.equal(album.crop.fr1.pid, 5);
  assert.equal(M.setCrop(album, "fr1", { pid: 5, s: 1, px: 0.5, py: 0.5 }).crop.fr1, undefined);
  const swapped = { ...album, assign: { fr1: 6 } };
  assert.deepEqual(M.getCrop(swapped, "fr1"), { pid: 6, s: 1, px: 0.5, py: 0.5 });
});

test("PR ① 저장본을 열면 펼침면 id · 사이즈 · 안내선 · 위치를 채운다", () => {
  const old = M.createAlbum();
  const raw = { ...old, spreads: old.spreads.map(({ frames, deco }) => ({ frames, deco })) };
  delete raw.page;
  delete raw.guides;
  delete raw.crop;
  const n = M.normalizeAlbum(raw);
  assert.equal(n.spreads[3].id, "sp4");
  assert.deepEqual(n.page, M.DEFAULT_PAGE);
  assert.deepEqual(n.guides, []);
  assert.deepEqual(n.crop, {});
});

test("숫자 뒤 조사 — 2 · 4 · 5 · 9로 끝나면 를", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9, 10, 12, 23].map(M.eulReul).join(""), "을를을를를을를을를을");
});

test("클라이언트가 고친 곳 — 사진이 바뀌었거나 위치가 바뀐 프레임만", () => {
  const { album, F } = fresh();
  const base = placeAll(album, F, [101, 102, 103]);
  let cur = M.placePhoto(M.selectFrame(base, F, "s1f2"), F, 200).album; // 02 교체
  cur = M.setCrop(cur, "s1f3", { pid: 103, s: 1.5, px: 0.3, py: 0.5 }); // 03 위치
  assert.deepEqual([...M.changedFrames(base, cur)].sort(), ["s1f2", "s1f3"]);
  assert.equal(M.changedFrames(base, base).size, 0);
  // 기본 위치를 지운 것과 기본값을 적은 것은 같다
  assert.equal(M.changedFrames(base, M.setCrop(base, "s1f1", { pid: 101, s: 1, px: 0.5, py: 0.5 })).size, 0);
});

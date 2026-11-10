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

test("다른 펼침면 프레임 이름은 펼침면을 붙인다", () => {
  const { album, F } = fresh();
  const f = F.byId.s3f1;
  assert.equal(M.frameLabel(f, 0), "펼침면 3의 01");
  assert.equal(M.frameLabel(f, 2), "01");
  const moved = M.goSpread(album, F, 2);
  assert.equal(moved.spread, 2);
  assert.equal(moved.cursor, "s3f1");
});

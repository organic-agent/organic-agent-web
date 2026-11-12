import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// 초대 클라이언트 상단 단계 칩(이슈 168) — 다른 테스트처럼 타입스크립트 소스를 바로 옮겨 불러온다
const source = readFileSync(new URL("../src/app/(client)/gallery/[galleryId]/_shell/invitedChips.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const C = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const ctx = (phase, more = {}) => ({ phase, album: true, deadlinePassed: false, canConfirm: false, albumConfirmed: false, ...more });
const act = (c, to) => C.invitedChipAction(c, to);

test("컨셉 분류 중에는 다른 칸이 모두 잠긴다", () => {
  assert.deepEqual(C.invitedChipStates(ctx("sort")), ["locked", "locked", "locked", "locked", "locked"]);
  assert.deepEqual(act(ctx("sort"), 1), { kind: "lock", text: "폴더를 확정하면 열려요" });
  assert.deepEqual(act(ctx("sort"), 0), { kind: "view", view: null });
});

test("셀렉 — 컨셉 분류는 보기만, 보정 검토는 전달하기 창(마감이 지나면 잠김)", () => {
  assert.deepEqual(C.invitedChipStates(ctx("select")), ["can", "can", "can", "locked", "locked"]);
  assert.deepEqual(act(ctx("select"), 0), { kind: "view", view: "sort" });
  assert.deepEqual(act(ctx("select"), 1), { kind: "view", view: null });
  assert.deepEqual(act(ctx("select"), 2), { kind: "request", request: "export" });
  assert.deepEqual(act(ctx("select", { deadlinePassed: true }), 2), { kind: "lock", text: "선택 마감이 지났어요" });
  assert.equal(C.invitedChipStates(ctx("select", { deadlinePassed: true }))[2], "locked");
  assert.deepEqual(act(ctx("select"), 3), { kind: "lock", text: "셀렉을 전달하면 넘어가요" });
});

test("보정 검토 — 지난 칸은 보기만, 다음 칸은 결과가 왔을 때만 보정 확정 창", () => {
  assert.deepEqual(C.invitedChipStates(ctx("review")), ["can", "can", "locked", "locked", "locked"]);
  assert.deepEqual(C.invitedChipStates(ctx("review", { canConfirm: true })), ["can", "can", "locked", "can", "locked"]);
  assert.deepEqual(act(ctx("review"), 1), { kind: "view", view: "select" });
  assert.deepEqual(act(ctx("review"), 3), { kind: "lock", text: "보정본이 오면 넘어갈 수 있어요" });
  assert.deepEqual(act(ctx("review", { canConfirm: true }), 3), { kind: "request", request: "confirm" });
  assert.deepEqual(act(ctx("review", { canConfirm: true }), 4), { kind: "lock", text: "스튜디오가 앨범을 보내면 넘어가요" });
  // 앨범 없는 갤러리 — 4칸, 다음 칸이 완료
  assert.deepEqual(C.invitedChipStates(ctx("submitted", { album: false, canConfirm: true })), ["can", "can", "locked", "can"]);
  assert.deepEqual(act(ctx("review", { album: false, canConfirm: true }), 3), { kind: "request", request: "confirm" });
});

test("앨범 구성 — 지금 칸은 스낵바, 보정 검토는 지금 화면, 완료는 잠김", () => {
  assert.deepEqual(C.invitedChipStates(ctx("album")), ["can", "can", "can", "locked", "locked"]);
  assert.equal(C.invitedStageIndex(ctx("album")), 3);
  assert.deepEqual(act(ctx("album"), 3), { kind: "lock", text: "스튜디오가 앨범을 만들고 있어요" });
  assert.deepEqual(act(ctx("album"), 2), { kind: "view", view: null });
  assert.deepEqual(act(ctx("album"), 4), { kind: "lock", text: "스튜디오가 앨범을 보내면 넘어가요" });
});

test("완료 — 앞 칸 모두 보기만, 앨범은 보낸 뒤에만", () => {
  assert.deepEqual(C.invitedChipStates(ctx("done", { albumConfirmed: true })), ["can", "can", "can", "can", "locked"]);
  assert.deepEqual(act(ctx("done", { albumConfirmed: true }), 3), { kind: "album" });
  assert.deepEqual(act(ctx("done"), 3), { kind: "lock", text: "스튜디오가 앨범을 보내면 넘어가요" });
  assert.deepEqual(act(ctx("done"), 4), { kind: "view", view: null });
  assert.equal(C.invitedStageIndex(ctx("done", { album: false })), 3);
  assert.deepEqual(C.invitedChipStates(ctx("done", { album: false })), ["can", "can", "can", "locked"]);
});

/**
 * 초대 클라이언트의 상단 단계 칩(이슈 168 결정 1) — 칸 상태와 누르면 할 일
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/invitedChips.ts
 *
 * 개인 결제 칩(이슈 147)과 같은 규칙을 초대 갤러리 4칸 · 5칸에 옮겼다(이슈 167 보드 ①~④ 추천안).
 * - 지난 칸은 보기만: 컨셉 분류 · 셀렉은 읽기 전용 화면, 보정 검토는 보정 사진(지금 단계 화면)
 * - 다음 칸은 단계를 넘기는 창: 셀렉 → 보정 검토 = 작가에게 전달하기 창, 보정 검토 → 다음 칸 = 보정 확정 창
 * - 지금 칸을 누르면 그 단계 화면으로 돌아온다. 앨범 구성 중이면 "스튜디오가 앨범을 만들고 있어요"
 * - 컨셉 분류 중에는 다른 칸이 모두 잠기고, 셀렉 중 컨셉 분류는 폴더를 보기만 한다(다시 정리하는 정리 모드는 이슈 167)
 * 칸 번호: 0 컨셉 분류 · 1 셀렉 & 보정 작성 · 2 보정 검토 · (3 앨범 구성) · 마지막 완료.
 *
 * 테스트(scripts/invited-chips.test.mjs)가 이 파일을 그대로 불러오므로 다른 모듈을 불러오지 않는다.
 */

export type InvitedPhase = "sort" | "select" | "submitted" | "review" | "album" | "done";

/** ShellTopbar의 StageChipState와 같은 값 */
export type InvitedChipState = "can" | "locked" | "off";

export type InvitedChipAction =
  /** 보는 화면 바꾸기 — null이면 지금 단계 화면 */
  | { kind: "view"; view: "sort" | "select" | null }
  /** 단계를 넘기는 창 — export = 작가에게 전달하기, confirm = 보정 확정 */
  | { kind: "request"; request: "export" | "confirm" }
  /** 앨범 화면으로 */
  | { kind: "album" }
  /** 잠김 — 이유를 스낵바로 */
  | { kind: "lock"; text: string };

export type InvitedChipContext = {
  phase: InvitedPhase;
  /** 스튜디오가 앨범을 만든 갤러리 — 5칸(3번이 앨범 구성) */
  album: boolean;
  /** 선택 마감이 지남 — 전달할 수 없다 */
  deadlinePassed: boolean;
  /** 최신 회차 결과가 와서 지금 보정을 확정할 수 있음 */
  canConfirm: boolean;
  /** 스튜디오가 앨범을 보내고 확정함 */
  albumConfirmed: boolean;
};

const ALBUM = 3;

export function invitedStageIndex(ctx: Pick<InvitedChipContext, "phase" | "album">): number {
  switch (ctx.phase) {
    case "sort":
      return 0;
    case "select":
      return 1;
    case "submitted":
    case "review":
      return 2;
    case "album":
      return ctx.album ? ALBUM : 2;
    case "done":
      return ctx.album ? 4 : 3;
  }
}

/** 보정 검토 다음 칸 — 앨범 갤러리면 앨범 구성, 아니면 완료 */
const afterReview = (ctx: InvitedChipContext) => (ctx.album ? ALBUM : 3);

/** 칸마다 상태(지금 칸 자리의 값은 쓰지 않는다) */
export function invitedChipStates(ctx: InvitedChipContext): InvitedChipState[] {
  const states: InvitedChipState[] = Array.from({ length: ctx.album ? 5 : 4 }, () => "locked");
  if (ctx.phase === "sort") return states;
  states[0] = "can";
  states[1] = "can";
  if (ctx.phase === "select") states[2] = ctx.deadlinePassed ? "locked" : "can";
  else if (ctx.phase === "submitted" || ctx.phase === "review") states[afterReview(ctx)] = ctx.canConfirm ? "can" : "locked";
  else {
    states[2] = "can";
    if (ctx.album && ctx.phase === "done") states[ALBUM] = ctx.albumConfirmed ? "can" : "locked";
  }
  return states;
}

/** 칸을 누르면 할 일 */
export function invitedChipAction(ctx: InvitedChipContext, to: number): InvitedChipAction {
  const lock = (text: string): InvitedChipAction => ({ kind: "lock", text });
  const view = (v: "sort" | "select" | null): InvitedChipAction => ({ kind: "view", view: v });
  if (to === invitedStageIndex(ctx)) return ctx.phase === "album" ? lock("스튜디오가 앨범을 만들고 있어요") : view(null);
  if (ctx.phase === "sort") return lock("폴더를 확정하면 열려요");
  if (to === 0) return view("sort");
  if (to === 1) return view("select");
  if (to === 2) {
    if (ctx.phase !== "select") return view(null);
    return ctx.deadlinePassed ? lock("선택 마감이 지났어요") : { kind: "request", request: "export" };
  }
  if (ctx.phase === "select") return lock("셀렉을 전달하면 넘어가요");
  if ((ctx.phase === "submitted" || ctx.phase === "review") && to === afterReview(ctx)) {
    return ctx.canConfirm ? { kind: "request", request: "confirm" } : lock("보정본이 오면 넘어갈 수 있어요");
  }
  if (ctx.album && to === ALBUM && ctx.albumConfirmed) return { kind: "album" };
  return lock("스튜디오가 앨범을 보내면 넘어가요");
}

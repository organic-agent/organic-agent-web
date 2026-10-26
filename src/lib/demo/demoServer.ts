/**
 * 체험용 가짜 서버 — 실제 개인 갤러리 화면이 부르는 API를 브라우저 안에서 흉내 낸다
 * 위치: src/lib/demo/demoServer.ts
 *
 * client.ts의 request()가 체험 모드일 때 fetch 대신 demoFetch()를 부른다. 경로 · 메서드로 처리기를 찾아 Response를 돌려주므로
 * 화면 코드는 한 줄도 모른다. 사진은 샘플 250장(samplePhotos), 폴더는 샘플의 구도 묶음 4개(화이트 스튜디오 › 전신 · 상반신 ·
 * 클로즈업 · 풍경). 진행(폴더 확정 · 별점 · 선택 · 공유폴더 · 보정 요청 · 요청서 내보내기)은 이 브라우저의 localStorage(sel.demo.v1)에만
 * 남고 resetDemoState()로 처음으로 돌아간다. AI 추천은 2.5초 뒤 별점 높은 순으로 고르고, AI 문장 다듬기는 간단한 규칙으로 답한다.
 * 체험에 없는 호출은 404(DEMO_404)로 돌려주고 콘솔에 남겨 빠진 것을 찾기 쉽게 한다.
 */

import { SAMPLE_FOLDERS, SAMPLE_PHOTOS, sampleIdsOf, samplePhotoUrl } from "@/app/_components/shots/samplePhotos";
import type { AiRecommendationList, AiSelectionJob } from "@/lib/api/recommendations";
import type { User } from "@/lib/api/auth";
import type { CollabCommentResponse } from "@/lib/api/collabGuest";
import type { CollabPhotoResponse, CollabSessionResponse } from "@/lib/api/collab";
import type { ConceptFolderResponse, DetailFolderResponse } from "@/lib/api/conceptFolders";
import type { GalleryInviteResponse } from "@/lib/api/invites";
import type { GalleryMemberResponse, GalleryResponse } from "@/lib/api/galleries";
import type { PhotoDetailResponse, PhotoResponse } from "@/lib/api/photos";
import type { PhotoSelectionResponse } from "@/lib/api/selection";
import type { RefineRetouchResponse, RetouchOverviewResponse, RetouchPhotoResponse, RetouchPoint, RetouchRoundResponse } from "@/lib/api/retouch";
import { track } from "@/lib/analytics";
import { DEMO_GALLERY_ID, DEMO_TITLE, DEMO_USER, DEMO_WORKSPACE_ID } from "./demoMode";

const KEY = "sel.demo.v1";
const TTL = 3600;
/** 선택 상한 — 체험은 10장(2026-10-26 수민) */
const MAX_PICK = 10;
const AI_MS = 2500;
const LATENCY_MS = 60;

type RetouchEntry = { requestText: string | null; points: RetouchPoint[] };
type Saved = {
  v: 1;
  foldersSavedAt: string | null;
  stage: "UPLOAD" | "RETOUCH";
  requestedAt: string | null;
  scores: Record<string, number>;
  selected: number[];
  folders: ConceptFolderResponse[];
  sessions: CollabSessionResponse[];
  sessionPhotos: Record<string, number[]>;
  retouch: Record<string, RetouchEntry>;
  nextId: number;
};

export type DemoPhase = "sort" | "select" | "review";

const G = DEMO_GALLERY_ID;
const now = () => new Date().toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 처음 폴더 — 상반신과 클로즈업은 한 폴더로 합쳐진 채 시작한다(2026-10-26 수민): 전신 100 · 상반신 125 · 풍경 25 */
function freshFolders(): ConceptFolderResponse[] {
  const [full, upper, close, wide] = SAMPLE_FOLDERS;
  const details: [string, number[]][] = [
    [full.name, sampleIdsOf(full)],
    [upper.name, [...sampleIdsOf(upper), ...sampleIdsOf(close)]],
    [wide.name, sampleIdsOf(wide)],
  ];
  return [
    {
      id: 1,
      galleryId: G,
      name: "화이트 스튜디오",
      sortOrder: 0,
      createdSource: "AI",
      analysisJobId: 1,
      details: details.map(([name, photoIds], i) => ({
        id: 10 + i,
        galleryId: G,
        conceptFolderId: 1,
        name,
        sortOrder: i,
        createdSource: "AI",
        needsReview: false,
        photoIds,
      })),
    },
  ];
}
function fresh(): Saved {
  return {
    v: 1,
    foldersSavedAt: null,
    stage: "UPLOAD",
    requestedAt: null,
    // 별점은 없는 채로 시작(2026-10-26 수민 — 셀렉은 별점을 매기는 데서 시작)
    scores: {},
    selected: [],
    folders: freshFolders(),
    sessions: [],
    sessionPhotos: {},
    retouch: {},
    nextId: 100,
  };
}

let state: Saved | null = null;
function load(): Saved {
  if (state) return state;
  let saved: Saved | null = null;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (raw) saved = JSON.parse(raw) as Saved;
  } catch {
    saved = null;
  }
  state = saved && saved.v === 1 ? saved : fresh();
  return state;
}
function save() {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장이 안 돼도 체험은 이어진다(새로 고치면 처음부터)
  }
}
/** 단계가 바뀌면(폴더 확정 · 요청서 내보내기 · 되돌리기 · 처음부터) DemoShell에 알린다 — 보정 확인부터는 막는다 */
const phaseListeners = new Set<() => void>();
function notifyPhase() {
  phaseListeners.forEach((l) => l());
}
export function subscribeDemoPhase(listener: () => void): () => void {
  phaseListeners.add(listener);
  return () => {
    phaseListeners.delete(listener);
  };
}
export function resetDemoState(): void {
  state = fresh();
  ai = null;
  aiRecs = null;
  save();
  notifyPhase();
}
export function demoPhase(): DemoPhase {
  const s = load();
  return s.stage === "RETOUCH" ? "review" : s.foldersSavedAt ? "select" : "sort";
}

// ── 사진 · 갤러리 ──
const PHOTO_BY_ID = new Map(SAMPLE_PHOTOS.map((p) => [p.photoId, p]));
/** 체험의 사진은 그리드 · 크게 보기 모두 원본(1024×1536)을 쓴다 — 썸네일은 크게 보기에서 흐리다 */
function photoOf(id: number): PhotoResponse | null {
  const base = PHOTO_BY_ID.get(id);
  if (!base) return null;
  const score = load().scores[String(id)];
  return { ...base, viewUrl: samplePhotoUrl(id), score: score ?? null };
}
function allPhotos(): PhotoResponse[] {
  return SAMPLE_PHOTOS.map((p) => photoOf(p.photoId)!);
}
function gallery(): GalleryResponse {
  const s = load();
  return {
    id: G,
    workspaceId: DEMO_WORKSPACE_ID,
    studioId: 0,
    title: DEMO_TITLE,
    status: "OPEN",
    workflowStatus: "IN_PROGRESS",
    stage: s.stage,
    shootType: "OTHER",
    selectionDeadline: daysFromNow(30),
    maxSelectablePhotoCount: MAX_PICK,
    maxRetouchRoundCount: 2,
    createdAt: daysFromNow(-3),
    photoOrganizationRequired: true,
    foldersSavedAt: s.foldersSavedAt,
    retouchConfirmedAt: null,
    archivedUntil: null,
    planExpiresAt: daysFromNow(27),
    planMaxPhotoCount: 500,
    planId: "FREE",
  };
}
const MEMBERS: GalleryMemberResponse[] = [{ memberId: 1, userId: DEMO_USER.id, nickname: DEMO_USER.nickname, email: null, joinedAt: daysFromNow(-3) }];

// ── 폴더 ──
function detailsOf(s: Saved): DetailFolderResponse[] {
  return s.folders.flatMap((c) => c.details);
}
function findDetail(s: Saved, detailId: number) {
  for (const c of s.folders) {
    const d = c.details.find((x) => x.id === detailId);
    if (d) return { concept: c, detail: d };
  }
  return null;
}
function unassign(s: Saved, ids: number[]) {
  const set = new Set(ids);
  for (const d of detailsOf(s)) d.photoIds = d.photoIds.filter((id) => !set.has(id));
}
let lastMerge: { mergeId: number; concept: ConceptFolderResponse; source: DetailFolderResponse; targetId: number; index: number } | null = null;

// ── 선택 ──
function selection(): PhotoSelectionResponse {
  const s = load();
  return {
    status: s.stage === "RETOUCH" ? "SUBMITTED" : "SELECTING",
    maxSelectablePhotoCount: MAX_PICK,
    selectedCount: s.selected.length,
    remainingCount: MAX_PICK - s.selected.length,
    submittedAt: s.requestedAt,
    photos: s.selected.map((id) => ({ photo: photoOf(id)!, retouchPhotoId: s.retouch[String(id)] ? id : null, resultUrl: null })),
    viewUrlTtlSeconds: TTL,
  };
}

// ── AI 추천(메모리에만 — 새로 고치면 지난 추천은 없는 것으로) ──
let ai: { startedAt: number; folderId: number | null } | null = null;
let aiRecs: { folderId: number | null; ids: number[]; round: number } | null = null;
let aiRound = 0;
function pickAi(s: Saved, folderId: number | null): number[] {
  const pool = folderId !== null ? (findDetail(s, folderId)?.detail.photoIds ?? []) : allPhotos().map((p) => p.photoId);
  const target = folderId !== null ? Math.max(3, Math.round((pool.length * MAX_PICK) / 250)) : 12;
  const scored = [...pool].sort((a, b) => (s.scores[String(b)] ?? 0) - (s.scores[String(a)] ?? 0) || ((a * 37) % 101) - ((b * 37) % 101));
  return scored.slice(0, target);
}
function recommendations(folderQuery: string | null): AiRecommendationList {
  const s = load();
  if (!aiRecs) return { round: null, job: null, photos: [], viewUrlTtlSeconds: TTL };
  const running = ai !== null && Date.now() - ai.startedAt < AI_MS;
  const job: AiSelectionJob = {
    jobId: aiRecs.round,
    selectionId: 1,
    mode: "DRAFT",
    status: running ? "RUNNING" : "DONE",
    folderSetJobId: 1,
    detailFolderId: aiRecs.folderId,
    round: running ? null : aiRecs.round,
    startedAt: now(),
    finishedAt: running ? null : now(),
    error: null,
    createdAt: now(),
    targetCount: aiRecs.ids.length,
    recommendedCount: running ? null : aiRecs.ids.length,
    shortfallCount: 0,
  };
  const wanted = folderQuery !== null ? Number(folderQuery) : null;
  const ids = running ? [] : aiRecs.ids.filter((id) => wanted === null || findDetail(s, wanted)?.detail.photoIds.includes(id));
  return {
    round: running ? null : aiRecs.round,
    job,
    photos: ids.map((id, i) => ({ folderId: aiRecs!.folderId, rank: i + 1, selected: s.selected.includes(id), photo: photoOf(id)!, round: aiRecs!.round })),
    viewUrlTtlSeconds: TTL,
  };
}

// ── 공유폴더 · 게스트 반응(가짜 값) ──
const LIKES = [0, 1, 3, 0, 2, 5, 1, 0, 4, 2];
function likesOf(id: number) {
  return LIKES[id % 10];
}
function commentsOf(id: number): CollabCommentResponse[] {
  const out: CollabCommentResponse[] = [];
  if (id % 4 === 0) out.push({ commentId: id * 10 + 1, nickname: "엄마", content: "이 표정이 제일 자연스러워요", createdAt: daysFromNow(-1), mine: false });
  if (id % 7 === 0) out.push({ commentId: id * 10 + 2, nickname: "지수", content: "드레스 라인 너무 예쁘다", createdAt: daysFromNow(-1), mine: false });
  return out;
}
function collabPhoto(id: number): CollabPhotoResponse {
  return { photoId: id, photo: photoOf(id)!, likeCount: likesOf(id), commentCount: commentsOf(id).length, liked: false };
}
type Scope = { type: "ALL" } | { type: "CONCEPT_FOLDERS"; conceptFolderIds: number[] } | { type: "DETAIL_FOLDERS"; detailFolderIds: number[] } | { type: "SESSIONS"; sessionIds: number[] };
function photosForScope(s: Saved, scope: Scope | undefined, photoIds: number[] | undefined): number[] {
  if (photoIds) return [...new Set(photoIds)];
  if (!scope || scope.type === "ALL") return allPhotos().map((p) => p.photoId);
  if (scope.type === "CONCEPT_FOLDERS") return s.folders.filter((c) => scope.conceptFolderIds.includes(c.id)).flatMap((c) => c.details.flatMap((d) => d.photoIds));
  if (scope.type === "DETAIL_FOLDERS") return detailsOf(s).filter((d) => scope.detailFolderIds.includes(d.id)).flatMap((d) => d.photoIds);
  return [...new Set(scope.sessionIds.flatMap((id) => s.sessionPhotos[String(id)] ?? []))];
}

// ── 보정 요청 ──
function retouchPhotos(s: Saved): RetouchPhotoResponse[] {
  return Object.entries(s.retouch)
    .map(([id, e]) => ({ retouchPhotoId: Number(id), photo: photoOf(Number(id))!, requestText: e.requestText, points: e.points, annotationUrl: null, hasResult: false }))
    .filter((r) => r.photo);
}
function currentRound(s: Saved): RetouchRoundResponse {
  return { roundNo: 1, status: s.stage === "RETOUCH" ? "REQUESTED" : "DRAFTING", requestedAt: s.requestedAt, completedAt: null, photos: retouchPhotos(s) };
}
function overview(): RetouchOverviewResponse {
  const s = load();
  const round = currentRound(s);
  return {
    maxRetouchRoundCount: 2,
    remainingRoundCount: s.stage === "RETOUCH" ? 1 : 2,
    rounds: s.stage === "RETOUCH" ? [{ roundNo: 1, status: "REQUESTED", requestedAt: s.requestedAt, completedAt: null, photoCount: round.photos.length }] : [],
    currentRound: round,
    viewUrlTtlSeconds: TTL,
  };
}
/** AI 문장 다듬기 흉내 — 규칙 몇 개로 정중한 요청 문장을 만든다 */
function refineText(text: string): string {
  const t = text.trim().replace(/[.。!]+$/, "");
  if (!t) return text;
  if (/지워|없애|빼/.test(t)) return `${t.replace(/(지워|없애|빼)\s*(줘|주세요)?$/, "")} 부분을 자연스럽게 지워 주세요.`.replace(/\s{2,}/g, " ");
  if (/밝게|환하게/.test(t)) return `${t.replace(/(조금만?|좀)\s*/g, "").replace(/(밝게|환하게)$/, "")} 부분을 자연스럽게 밝혀 주세요.`.replace(/\s{2,}/g, " ");
  if (/정리|다듬/.test(t)) return `${t.replace(/(정리|다듬)\s*(해\s*)?(줘|주세요)?$/, "")} 부분을 깔끔하게 정리해 주세요.`.replace(/\s{2,}/g, " ");
  return `${t} 부분을 자연스럽게 보정해 주세요.`;
}

// ── 응답 도우미 ──
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function noContent(): Response {
  return new Response(null, { status: 204 });
}
function fail(status: number, code: string, message: string): Response {
  return json({ code, message }, status);
}

type Handler = (m: RegExpMatchArray, body: Record<string, unknown>, q: URLSearchParams) => unknown;
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, pattern: string, handler: Handler) => routes.push([method, new RegExp(`^${pattern}$`), handler]);
const g = `/galleries/(\\d+)`;

// 사용자 · 갤러리
on("GET", "/users/me", () => DEMO_USER);
on("POST", "/auth/logout", () => undefined);
on("GET", "/galleries", () => [gallery()]);
on("GET", `${g}`, () => gallery());
on("PATCH", `${g}/personal`, () => gallery());
on("GET", `${g}/members`, () => MEMBERS);
on("DELETE", `${g}/members/\\d+`, () => undefined);
on("POST", `${g}/image-access`, () => ({ expiresAt: null, refreshAfterSeconds: null }));
// 분석 잡은 끝난 것으로 — 없다고 하면 화면이 스스로 분석을 요청하고(여기 없는 경로) 실패해 "다시 시도"가 뜬다
const DONE_JOB = () => ({ jobId: 1, galleryId: G, status: "DONE" as const, progress: { expected: 250, embedded: 250, scored: 250, categorized: 250, failed: 0 }, error: null, createdAt: daysFromNow(-3), finishedAt: daysFromNow(-3) });
on("GET", `${g}/ai-analysis`, () => DONE_JOB());
on("POST", `${g}/ai-analysis`, () => DONE_JOB());
on("GET", `${g}/invite`, () => invite());
on("POST", `${g}/invites`, () => invite());
on("DELETE", `${g}/invites/\\d+`, () => undefined);
function invite(): GalleryInviteResponse {
  return { id: 1, galleryId: G, kind: "PERSONAL_PARTNER", maxUses: 1, usedCount: 0, inviteUrl: "https://easyselect.kr/invite/demo-partner", status: "ACTIVE", expiresAt: daysFromNow(7), revokedAt: null, createdAt: now() };
}

// 알림
on("GET", "/notifications", () => []);
on("PATCH", "/notifications/read", () => ({ updatedCount: 0, unreadCount: 0 }));
on("GET", "/notifications/settings", () => ({ emailEnabled: true, browserEnabled: true }));
on("PUT", "/notifications/settings", (_m, body) => body);

// 사진
on("GET", `${g}/photos/summary`, () => ({ total: 250, pending: 0, uploaded: 250, embedded: 250, scored: 250, categorized: 250, failed: 0 }));
on("GET", `${g}/photos/trash`, () => ({ contents: [], totalCount: 0, page: 0, size: 200, hasNext: false }));
on("GET", `${g}/photos`, (_m, _b, q) => {
  const page = Number(q.get("page") ?? 0);
  const size = Number(q.get("size") ?? 200);
  const all = allPhotos();
  const contents = all.slice(page * size, page * size + size);
  return { page, size, totalCount: all.length, hasNext: (page + 1) * size < all.length, contents, viewUrlTtlSeconds: TTL, viewUrlsExpire: false };
});
on("GET", `${g}/photos/(\\d+)`, (m) => {
  const photo = photoOf(Number(m[2]));
  if (!photo) return fail(404, "PHOTO_404_1", "사진이 없어요");
  const detail: PhotoDetailResponse = { ...photo, originalUrl: samplePhotoUrl(photo.photoId), viewUrlTtlSeconds: TTL, originalUrlTtlSeconds: TTL, metadata: null };
  return detail;
});
on("DELETE", `${g}/photos`, () => undefined);
on("PUT", `${g}/photos/(\\d+)/rating`, (m, body) => {
  const s = load();
  const id = Number(m[2]);
  s.scores[String(id)] = Number(body.score);
  save();
  return { photoId: id, score: Number(body.score), ratedBy: DEMO_USER.id, updatedAt: now() };
});
on("DELETE", `${g}/photos/(\\d+)/rating`, (m) => {
  const s = load();
  delete s.scores[String(Number(m[2]))];
  save();
  return undefined;
});

// 폴더
on("GET", `${g}/concept-folders`, () => load().folders);
on("POST", `${g}/concept-folders/ai`, () => load().folders);
on("POST", `${g}/folders/from-clusters`, () => {
  const s = load();
  if (!s.foldersSavedAt) {
    s.foldersSavedAt = now();
    save();
    track("demo_stage_changed", { phase: "select" });
    notifyPhase();
  }
  return s.folders;
});
on("POST", `${g}/concept-folders`, (_m, body) => {
  const s = load();
  const concept: ConceptFolderResponse = { id: s.nextId++, galleryId: G, name: String(body.name ?? "새 컨셉"), sortOrder: s.folders.length, createdSource: "USER", analysisJobId: null, details: [] };
  s.folders.push(concept);
  save();
  return concept;
});
on("POST", `${g}/concept-folders/(\\d+)/detail-folders`, (m, body) => {
  const s = load();
  const concept = s.folders.find((c) => c.id === Number(m[2]));
  if (!concept) return fail(404, "CATEGORY_404_1", "컨셉 폴더가 없어요");
  const detail: DetailFolderResponse = { id: s.nextId++, galleryId: G, conceptFolderId: concept.id, name: String(body.name ?? "새 폴더"), sortOrder: concept.details.length, createdSource: "USER", needsReview: false, photoIds: [] };
  concept.details.push(detail);
  save();
  return detail;
});
on("PATCH", `${g}/concept-folders/(\\d+)`, (m, body) => {
  const s = load();
  const concept = s.folders.find((c) => c.id === Number(m[2]));
  if (!concept) return fail(404, "CATEGORY_404_1", "컨셉 폴더가 없어요");
  concept.name = String(body.name ?? concept.name);
  save();
  return concept;
});
on("PATCH", `${g}/concept-folders/(\\d+)/detail-folders/(\\d+)`, (m, body) => {
  const s = load();
  const hit = findDetail(s, Number(m[3]));
  if (!hit) return fail(404, "CATEGORY_404_2", "세부 폴더가 없어요");
  hit.detail.name = String(body.name ?? hit.detail.name);
  save();
  return hit.detail;
});
on("DELETE", `${g}/concept-folders/(\\d+)`, (m) => {
  const s = load();
  s.folders = s.folders.filter((c) => c.id !== Number(m[2]));
  save();
  return undefined;
});
on("DELETE", `${g}/concept-folders/(\\d+)/detail-folders/(\\d+)`, (m) => {
  const s = load();
  const hit = findDetail(s, Number(m[3]));
  if (hit) hit.concept.details = hit.concept.details.filter((d) => d.id !== hit.detail.id);
  save();
  return undefined;
});
on("POST", `${g}/category-assignments/move`, (_m, body) => {
  const s = load();
  const ids = (body.photoIds as number[]) ?? [];
  unassign(s, ids);
  const target = body.targetDetailFolderId as number | null;
  if (target !== null && target !== undefined) {
    const hit = findDetail(s, target);
    if (!hit) return fail(404, "CATEGORY_404_2", "세부 폴더가 없어요");
    hit.detail.photoIds.push(...ids);
  }
  save();
  return undefined;
});
on("POST", `${g}/concept-folders/(\\d+)/detail-folders/(\\d+)/merge`, (m, body) => {
  const s = load();
  const src = findDetail(s, Number(m[3]));
  const dst = findDetail(s, Number(body.targetDetailFolderId));
  if (!src || !dst) return fail(404, "CATEGORY_404_2", "세부 폴더가 없어요");
  if (src.detail.id === dst.detail.id) return fail(400, "CATEGORY_400_3", "같은 폴더예요");
  const index = src.concept.details.indexOf(src.detail);
  dst.detail.photoIds.push(...src.detail.photoIds);
  src.concept.details = src.concept.details.filter((d) => d.id !== src.detail.id);
  lastMerge = { mergeId: s.nextId++, concept: src.concept, source: { ...src.detail }, targetId: dst.detail.id, index };
  save();
  return { mergeId: lastMerge.mergeId, target: dst.detail };
});
on("POST", "/galleries/\\d+/detail-folder-merges/(\\d+)/undo", (m) => {
  const s = load();
  if (!lastMerge || lastMerge.mergeId !== Number(m[1])) return fail(409, "CATEGORY_409_4", "이미 되돌렸어요");
  const dst = findDetail(s, lastMerge.targetId);
  const moved = new Set(lastMerge.source.photoIds);
  if (dst) dst.detail.photoIds = dst.detail.photoIds.filter((id) => !moved.has(id));
  const concept = s.folders.find((c) => c.id === lastMerge!.concept.id) ?? s.folders[0];
  concept.details.splice(lastMerge.index, 0, lastMerge.source);
  const out = { source: lastMerge.source, target: dst?.detail ?? null };
  lastMerge = null;
  save();
  return out;
});

// 선택
on("GET", `${g}/photo-selection`, () => selection());
on("POST", `${g}/photo-selection/photos`, (_m, body) => {
  const s = load();
  for (const id of (body.photoIds as number[]) ?? []) if (!s.selected.includes(id) && s.selected.length < MAX_PICK) s.selected.push(id);
  save();
  return selection();
});
on("DELETE", `${g}/photo-selection/photos`, (_m, body) => {
  const s = load();
  const drop = new Set((body.photoIds as number[]) ?? []);
  s.selected = s.selected.filter((id) => !drop.has(id));
  save();
  return selection();
});
on("DELETE", `${g}/photo-selection/photos/(\\d+)`, (m) => {
  const s = load();
  s.selected = s.selected.filter((id) => id !== Number(m[2]));
  save();
  return undefined;
});
on("POST", `${g}/photo-selection/submit`, () => selection());
on("POST", `${g}/photo-selection/withdraw`, () => {
  const s = load();
  s.stage = "UPLOAD";
  s.requestedAt = null;
  save();
  notifyPhase();
  return selection();
});
on("POST", `${g}/max-selectable-increase-request`, () => undefined);
on("GET", `${g}/photo-selection/export`, () => {
  const s = load();
  if (s.stage !== "RETOUCH") {
    s.stage = "RETOUCH";
    s.requestedAt = now();
    save();
    track("demo_stage_changed", { phase: "review" });
    notifyPhase();
  }
  const rows = s.selected.map((id, i) => `${i + 1},${photoOf(id)?.originalFileName ?? id},${s.retouch[String(id)]?.requestText ?? ""}`);
  return new Response(`﻿번호,파일,보정 요청\n${rows.join("\n")}\n`, { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } });
});

// AI 추천
on("GET", `${g}/photo-selection/recommendations`, (_m, _b, q) => recommendations(q.get("folderId")));
on("POST", `${g}/photo-selection/recommendations`, (_m, body) => {
  if (ai && Date.now() - ai.startedAt < AI_MS) return fail(409, "RECOMMENDATION_409_1", "이미 추천하는 중이에요");
  const s = load();
  const folderId = body.detailFolderId === undefined || body.detailFolderId === null ? null : Number(body.detailFolderId);
  ai = { startedAt: Date.now(), folderId };
  aiRound += 1;
  aiRecs = { folderId, ids: pickAi(s, folderId), round: aiRound };
  return undefined;
});

// 공유폴더
on("GET", `${g}/collab-sessions`, () => load().sessions);
on("POST", `${g}/collab-sessions`, (_m, body) => {
  const s = load();
  const ids = photosForScope(s, body.scope as Scope | undefined, body.photoIds as number[] | undefined);
  const session: CollabSessionResponse = {
    sessionId: s.nextId++,
    galleryId: G,
    name: String(body.name ?? "공유폴더"),
    collabUrl: `https://easyselect.kr/collab/demo-${s.nextId}`,
    revoked: false,
    revokedAt: null,
    photoCount: ids.length,
    participantCount: 3,
    createdAt: now(),
    expiresAt: daysFromNow(14),
    coverTitle: (body.coverTitle as string | null | undefined) ?? null,
    coverAuthor: (body.coverAuthor as string | null | undefined) ?? null,
    includeAllAlbums: Boolean(body.includeAllAlbums),
  };
  s.sessions.push(session);
  s.sessionPhotos[String(session.sessionId)] = ids;
  save();
  return session;
});
on("PATCH", `${g}/collab-sessions/(\\d+)`, (m, body) => {
  const s = load();
  const session = s.sessions.find((x) => x.sessionId === Number(m[2]));
  if (!session) return fail(404, "COLLAB_404_1", "공유폴더가 없어요");
  if (typeof body.name === "string") session.name = body.name;
  if (body.coverTitle !== undefined) session.coverTitle = body.coverTitle as string | null;
  if (body.coverAuthor !== undefined) session.coverAuthor = body.coverAuthor as string | null;
  if (body.includeAllAlbums !== undefined && body.includeAllAlbums !== null) session.includeAllAlbums = Boolean(body.includeAllAlbums);
  save();
  return session;
});
on("DELETE", `${g}/collab-sessions/(\\d+)`, (m) => {
  const s = load();
  const session = s.sessions.find((x) => x.sessionId === Number(m[2]));
  if (session) {
    session.revoked = true;
    session.revokedAt = now();
  }
  save();
  return undefined;
});
on("POST", `${g}/collab-sessions/(\\d+)/republish`, (m) => {
  const s = load();
  const session = s.sessions.find((x) => x.sessionId === Number(m[2]));
  if (!session) return fail(404, "COLLAB_404_1", "공유폴더가 없어요");
  session.revoked = false;
  session.revokedAt = null;
  save();
  return session;
});
on("POST", `${g}/collab-sessions/(\\d+)/photos`, (m, body) => {
  const s = load();
  const session = s.sessions.find((x) => x.sessionId === Number(m[2]));
  if (!session) return fail(404, "COLLAB_404_1", "공유폴더가 없어요");
  const key = String(session.sessionId);
  s.sessionPhotos[key] = [...new Set([...(s.sessionPhotos[key] ?? []), ...((body.photoIds as number[]) ?? [])])];
  session.photoCount = s.sessionPhotos[key].length;
  save();
  return session;
});
on("GET", `${g}/collab-sessions/(\\d+)/participants`, () => [
  { participantId: 1, nickname: "엄마", participantType: "GUEST", enteredAt: daysFromNow(-1) },
  { participantId: 2, nickname: "아빠", participantType: "GUEST", enteredAt: daysFromNow(-1) },
  { participantId: 3, nickname: "지수", participantType: "GUEST", enteredAt: daysFromNow(-1) },
]);
on("GET", `${g}/collab-sessions/(\\d+)/photos`, (m, _b, q) => {
  const s = load();
  const ids = s.sessionPhotos[String(Number(m[2]))] ?? [];
  const page = Number(q.get("page") ?? 0);
  const size = Number(q.get("size") ?? 200);
  const contents = ids.slice(page * size, page * size + size).map(collabPhoto);
  return { page, size, totalCount: ids.length, hasNext: (page + 1) * size < ids.length, contents, viewUrlTtlSeconds: TTL };
});
on("GET", `${g}/collab-sessions/(\\d+)/photos/(\\d+)/comments`, (m) => {
  const contents = commentsOf(Number(m[3]));
  return { page: 0, size: 50, totalCount: contents.length, hasNext: false, contents };
});

// 보정 요청
on("GET", `${g}/retouch/rounds`, () => overview());
on("GET", `${g}/retouch/rounds/(\\d+)`, () => {
  const s = load();
  const round = currentRound(s);
  return { ...round, photos: round.photos.map((p) => ({ ...p, resultUrl: null })), viewUrlTtlSeconds: TTL };
});
on("GET", `${g}/retouch/rounds/(\\d+)/requests\\.pdf`, () => new Response("%PDF-1.4\n% Easy Select 체험 요청서\n%%EOF\n", { status: 200, headers: { "content-type": "application/pdf" } }));
on("POST", `${g}/retouch/photos`, (_m, body) => {
  const s = load();
  for (const id of (body.photoIds as number[]) ?? []) s.retouch[String(id)] ??= { requestText: null, points: [] };
  save();
  return {};
});
on("PUT", `${g}/retouch/photos/(\\d+)/request`, (m, body) => {
  const s = load();
  s.retouch[String(Number(m[2]))] = { requestText: (body.requestText as string | null) ?? null, points: (body.points as RetouchPoint[]) ?? [] };
  save();
  return {};
});
on("POST", `${g}/retouch/rounds/(\\d+)/requests`, () => overview());
on("POST", `${g}/retouch/confirm`, () => overview());
on("POST", `${g}/retouch/requests/refine`, async (_m, body) => {
  await sleep(1100);
  const text = String(body.text ?? "");
  const res: RefineRetouchResponse = { originalText: text, refinedText: refineText(text), available: true, status: "READY", tappedObject: null, pointMatchesText: true, items: [], question: null, options: null };
  return res;
});

/** 관문이 부른다 — 경로 · 메서드로 처리기를 찾아 Response로 */
export async function demoFetch(path: string, options: { method?: string; body?: unknown } = {}): Promise<Response> {
  await sleep(LATENCY_MS);
  const method = options.method ?? "GET";
  const [rawPath, rawQuery = ""] = path.split("?");
  const p = rawPath.replace(/^\/api\/v1/, "");
  const q = new URLSearchParams(rawQuery);
  const body = (options.body ?? {}) as Record<string, unknown>;
  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = p.match(re);
    if (!match) continue;
    const out = await handler(match, body, q);
    if (out instanceof Response) return out;
    if (out === undefined) return noContent();
    return json(out);
  }
  console.warn(`[체험] 없는 API: ${method} ${p}`);
  return fail(404, "DEMO_404", "체험에서는 없는 기능이에요");
}

export type { User as DemoUser };

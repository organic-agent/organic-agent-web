"use client";

/**
 * 싱글뷰 "보정 요청" 탭 — 사진 위 점(번호) + 점마다 한 문장 + AI 내용 다듬기 · 전체 요청 한 칸
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/RetouchPanel.tsx
 *
 * 사진 위를 누르면 점이 생긴다(부모가 좌표를 넘김). 점 제목은 없고 번호만(서버 RetouchPoint에 제목 필드 없음).
 * "AI 내용 다듬기" → 다듬는 중 → AI 제안 + 적용 → 적용되면 제안 문장이 요청 문장이 되고 "원래 문장으로"가 남는다
 * (useRefinedText). 초안은 브라우저(retouchDraft)에 두고 전달하기에 함께 실려 간다.
 * 모든 사진에 쓸 수 있지만 서버는 **고른 사진의 요청만** 받는다 — 안 고른 사진이면 안내를 띄운다.
 */

import { useState, useSyncExternalStore } from "react";
import { CheckCircleIcon, SparkleIcon, TrashIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/client";
import { refineRetouchText } from "@/lib/api/retouch";
import { type DraftPoint, draftOf, type PhotoDraft, retouchDraftStore, writeDraft } from "./retouchDraft";

/** 사진 위에 얹는 번호 점 — Lightbox overlay */
export function RetouchPins({ points, onRemove }: { points: DraftPoint[]; onRemove?: (id: string) => void }) {
  return (
    <>
      {points.map((p, i) => (
        <button
          key={p.id}
          type="button"
          aria-label={`포인트 ${i + 1}${onRemove ? " — 누르면 지우기" : ""}`}
          title={p.useRefinedText && p.refinedText ? p.refinedText : p.text}
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(p.id);
          }}
          className={`absolute grid size-5.5 -translate-1/2 place-items-center rounded-full border-2 border-white bg-brand-secondary-default type-label-semibold-xs text-white shadow-[0_2px_6px_rgba(0,0,0,.35)] ${
            onRemove ? "cursor-pointer hover:bg-function-error-default" : "cursor-default"
          }`}
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
        >
          {i + 1}
        </button>
      ))}
    </>
  );
}

type Refine = { state: "loading" } | { state: "unavailable" } | { state: "error"; message: string };

export function RetouchPanel({
  galleryId,
  photoId,
  picked,
  editable,
}: {
  galleryId: number;
  photoId: number;
  /** 고른 사진인가 — 아니면 전달되지 않는다는 안내 */
  picked: boolean;
  editable: boolean;
}) {
  const raw = useSyncExternalStore(retouchDraftStore.subscribe, () => retouchDraftStore.readRaw(galleryId), () => "");
  const draft = draftOf(retouchDraftStore.parse(raw), photoId);
  const [refining, setRefining] = useState<Map<string, Refine>>(() => new Map());

  function save(next: PhotoDraft) {
    writeDraft(galleryId, photoId, next);
  }
  function updatePoint(id: string, patch: Partial<DraftPoint>) {
    save({ ...draft, points: draft.points.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }
  function removePoint(id: string) {
    save({ ...draft, points: draft.points.filter((p) => p.id !== id) });
  }
  async function refine(point: DraftPoint) {
    const text = point.text.trim();
    if (!text) return;
    setRefining((prev) => new Map(prev).set(point.id, { state: "loading" }));
    try {
      const res = await refineRetouchText(galleryId, text);
      setRefining((prev) => {
        const next = new Map(prev);
        if (!res.available || !res.refinedText) next.set(point.id, { state: "unavailable" });
        else next.delete(point.id);
        return next;
      });
      if (res.available && res.refinedText) updatePoint(point.id, { refinedText: res.refinedText, useRefinedText: false });
    } catch (err) {
      setRefining((prev) =>
        new Map(prev).set(point.id, { state: "error", message: err instanceof ApiError ? err.message : "잠시 뒤 다시 시도해 주세요" }),
      );
    }
  }

  return (
    <>
      {!picked && (
        <p className="rounded-(--radius-8) bg-function-warning-background px-3 py-2 type-content-xs text-contents-light-bgd-default">
          아직 고르지 않은 사진이에요. 요청은 <b>고른 사진만</b> 작가에게 전달돼요 — 써 두면 나중에 고를 때 함께 가요.
        </p>
      )}

      <section className="flex flex-col gap-1.5">
        <h4 className="type-label-semibold-xs text-contents-light-bgd-weakness">이 사진 전체 요청 (선택)</h4>
        <textarea
          value={draft.requestText}
          disabled={!editable}
          onChange={(e) => save({ ...draft, requestText: e.target.value })}
          placeholder="예) 전체적으로 밝고 따뜻하게"
          rows={2}
          className="w-full resize-none rounded-(--radius-8) border border-border-default bg-transparent px-2.5 py-2 type-content-s text-contents-light-bgd-default placeholder:text-contents-light-bgd-weakness focus:border-contents-light-bgd-sub focus:outline-none disabled:opacity-60"
        />
      </section>

      {draft.points.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-(--radius-12) border border-dashed border-border-default px-4 py-8 text-center">
          <p className="type-content-s leading-relaxed text-contents-light-bgd-sub">
            보정하고 싶은 부분을
            <br />
            사진 위에서 눌러 표시해 주세요
          </p>
          <p className="type-content-xs text-contents-light-bgd-weakness">점마다 한 문장씩 · 작가에게 그대로 전달돼요</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {draft.points.map((p, i) => {
            const r = refining.get(p.id);
            const applied = p.useRefinedText && !!p.refinedText;
            return (
              <li key={p.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 type-label-semibold-s text-contents-light-bgd-default">
                  <span className="grid size-4.5 place-items-center rounded-full bg-brand-secondary-default type-label-semibold-xs text-white">{i + 1}</span>
                  포인트 {i + 1}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => removePoint(p.id)}
                      aria-label={`포인트 ${i + 1} 지우기`}
                      className="ml-auto grid size-6.5 cursor-pointer place-items-center rounded-(--radius-4) text-contents-light-bgd-weakness transition-colors duration-fast hover:bg-surface-default-lightness hover:text-function-error-default"
                    >
                      <TrashIcon size={16} />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2 rounded-(--radius-8) border border-border-default p-2.5">
                  {applied ? (
                    <>
                      <p className="type-content-s leading-relaxed text-contents-light-bgd-default">{p.refinedText}</p>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={!editable}
                          onClick={() => updatePoint(p.id, { useRefinedText: false })}
                          className="cursor-pointer type-content-xs text-contents-light-bgd-weakness underline underline-offset-2 hover:text-contents-light-bgd-sub"
                        >
                          원래 문장으로
                        </button>
                        <span className="inline-flex items-center gap-1 type-content-xs text-brand-secondary-dark">
                          <CheckCircleIcon size={14} />
                          AI가 다듬은 문장
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <textarea
                        value={p.text}
                        disabled={!editable}
                        onChange={(e) => updatePoint(p.id, { text: e.target.value, refinedText: null, useRefinedText: false })}
                        placeholder="예) 볼 라인 정리"
                        rows={2}
                        className="w-full resize-none bg-transparent type-content-s text-contents-light-bgd-default placeholder:text-contents-light-bgd-weakness focus:outline-none disabled:opacity-60"
                      />
                      {r?.state === "loading" ? (
                        <div className="h-12 animate-pulse rounded-(--radius-8) bg-brand-secondary-background" aria-label="AI가 문장을 다듬는 중" />
                      ) : p.refinedText ? (
                        <div className="flex flex-col gap-1.5 rounded-(--radius-8) bg-brand-secondary-background px-2.5 py-2">
                          <span className="inline-flex w-fit items-center gap-1 rounded-(--radius-4) bg-background-default-main px-1.5 py-0.5 type-label-semibold-xs text-brand-secondary-dark">
                            <SparkleIcon size={12} />
                            AI 제안
                          </span>
                          <p className="type-content-s leading-relaxed text-contents-light-bgd-default">{p.refinedText}</p>
                          <button
                            type="button"
                            disabled={!editable}
                            onClick={() => updatePoint(p.id, { useRefinedText: true })}
                            className="inline-flex h-6.5 cursor-pointer items-center gap-1 self-end rounded-(--pill) bg-brand-secondary-default px-2.5 type-label-semibold-xs text-white transition-opacity duration-fast hover:opacity-90"
                          >
                            적용
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="type-content-xs text-function-error-default">
                            {r?.state === "error" ? r.message : r?.state === "unavailable" ? "지금은 AI 다듬기를 쓸 수 없어요" : ""}
                          </span>
                          <button
                            type="button"
                            disabled={!editable || !p.text.trim()}
                            onClick={() => void refine(p)}
                            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-(--radius-4) bg-surface-default-medium px-2.5 type-label-medium-xs text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-light disabled:cursor-default disabled:opacity-50"
                          >
                            <span className="text-brand-secondary-default">
                              <SparkleIcon size={14} />
                            </span>
                            AI 내용 다듬기
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="type-content-xs text-contents-light-bgd-weakness">
        {editable ? "사진 위를 눌러 점을 더 추가할 수 있어요 · 점을 누르면 지워져요" : "전달한 뒤에는 바꿀 수 없어요"}
      </p>
    </>
  );
}

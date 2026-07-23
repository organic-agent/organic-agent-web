import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/localStore";

export type RetouchStatus = "waiting" | "working" | "done";

export const RETOUCH_STATUS_LABEL: Record<RetouchStatus, string> = {
  waiting: "미확인",
  working: "작업 중",
  done: "보정 완료",
};

export type PhotographerPhotoWorkflow = {
  status: RetouchStatus;
  recommended: boolean;
  note: string;
};

const DEFAULT_WORKFLOW: PhotographerPhotoWorkflow = {
  status: "waiting",
  recommended: false,
  note: "",
};

const workflowStore = createLocalStore<Record<number, PhotographerPhotoWorkflow>>(
  "wes.photographerPhotoWorkflow",
  {},
);

export function usePhotographerPhotoWorkflows() {
  return useSyncExternalStore(
    workflowStore.subscribe,
    workflowStore.get,
    workflowStore.getServerSnapshot,
  );
}

export function getPhotoWorkflow(
  workflows: Record<number, PhotographerPhotoWorkflow>,
  photoId: number,
) {
  return workflows[photoId] ?? DEFAULT_WORKFLOW;
}

export type PhotoWorkflowSummary = Record<RetouchStatus, number> & {
  total: number;
  incomplete: number;
};

export function summarizePhotoWorkflows(
  workflows: Record<number, PhotographerPhotoWorkflow>,
  photoIds: number[],
): PhotoWorkflowSummary {
  const summary: PhotoWorkflowSummary = {
    total: photoIds.length,
    waiting: 0,
    working: 0,
    done: 0,
    incomplete: 0,
  };

  for (const photoId of photoIds) {
    summary[getPhotoWorkflow(workflows, photoId).status] += 1;
  }

  summary.incomplete = summary.waiting + summary.working;
  return summary;
}

export function updatePhotoWorkflow(
  photoId: number,
  patch: Partial<PhotographerPhotoWorkflow>,
) {
  const current = workflowStore.get();
  const next = {
    ...current,
    [photoId]: { ...DEFAULT_WORKFLOW, ...current[photoId], ...patch },
  };
  workflowStore.set(next);
  return next;
}

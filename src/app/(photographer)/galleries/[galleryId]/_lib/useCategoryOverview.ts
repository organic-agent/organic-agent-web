import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  getLatestCategorization,
  listConceptFolders,
  materializeAnalysis,
  runCategorization,
  type CategorizationJobResponse,
  type ConceptFolderResponse,
} from "@/lib/api/categories";

export type CategoryOverviewResult =
  | {
      kind: "ready";
      folders: ConceptFolderResponse[];
      latestJob: CategorizationJobResponse | null;
    }
  | { kind: "error" };

export function useCategoryOverview(rawGalleryId: string) {
  const galleryId = Number(rawGalleryId);
  const validId = Number.isInteger(galleryId) && galleryId > 0;
  const [result, setResult] = useState<CategoryOverviewResult | null>(null);
  const [running, setRunning] = useState(false);

  const reload = useCallback(async () => {
    if (!validId) {
      setResult({ kind: "error" });
      return;
    }
    try {
      const [folders, latestJob] = await Promise.all([
        listConceptFolders(galleryId),
        getLatestCategorization(galleryId).catch((error) => {
          if (error instanceof ApiError && error.status === 404) return null;
          throw error;
        }),
      ]);
      setResult({ kind: "ready", folders, latestJob });
    } catch {
      setResult({ kind: "error" });
    }
  }, [galleryId, validId]);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    void Promise.all([
      listConceptFolders(galleryId),
      getLatestCategorization(galleryId).catch((error) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
    ])
      .then(([folders, latestJob]) => {
        if (!cancelled) setResult({ kind: "ready", folders, latestJob });
      })
      .catch(() => {
        if (!cancelled) setResult({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [galleryId, validId]);

  async function categorize() {
    if (!validId || running) return;
    setRunning(true);
    try {
      await runCategorization(galleryId);
      await materializeAnalysis(galleryId);
      await reload();
    } finally {
      setRunning(false);
    }
  }

  return { result, reload, categorize, running };
}

import { useEffect, useState } from "react";
import {
  getRetouchOverview,
  type RetouchOverviewResponse,
} from "@/lib/api/retouch";

export function useRetouchOverview(rawGalleryId: string) {
  const galleryId = Number(rawGalleryId);
  const validId = Number.isInteger(galleryId) && galleryId > 0;
  const [result, setResult] = useState<RetouchOverviewResponse | null>(null);

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    void getRetouchOverview(galleryId)
      .then((overview) => {
        if (!cancelled) setResult(overview);
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      });
    return () => {
      cancelled = true;
    };
  }, [galleryId, validId]);

  return result;
}

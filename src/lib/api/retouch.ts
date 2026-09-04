import { api } from "@/lib/api/client";
import type { PhotoResponse } from "@/lib/api/photos";

export type RetouchRoundStatus = "DRAFTING" | "REQUESTED" | "COMPLETED";

export type RetouchPhotoResponse = {
  retouchPhotoId: number;
  photo: PhotoResponse;
  requestText: string | null;
  annotationUrl: string | null;
  hasResult: boolean;
};

export type RetouchOverviewResponse = {
  maxRetouchRoundCount: number | null;
  remainingRoundCount: number | null;
  rounds: {
    roundNo: number;
    status: RetouchRoundStatus;
    requestedAt: string | null;
    completedAt: string | null;
    photoCount: number;
  }[];
  currentRound: {
    roundNo: number;
    status: RetouchRoundStatus;
    requestedAt: string | null;
    completedAt: string | null;
    photos: RetouchPhotoResponse[];
  } | null;
  viewUrlTtlSeconds: number;
};

export function getRetouchOverview(galleryId: number): Promise<RetouchOverviewResponse> {
  return api(`/api/v1/galleries/${galleryId}/retouch`);
}

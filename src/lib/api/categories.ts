import { api } from "@/lib/api/client";

export type CategorizationPhotoStatus =
  | "PENDING"
  | "ASSIGNED"
  | "UNCLASSIFIED"
  | "FAILED";

export type DetailFolderResponse = {
  id: number;
  galleryId: number;
  conceptFolderId: number;
  name: string;
  sortOrder: number;
  createdSource: "AI" | "USER";
  category: string | null;
  needsReview: boolean;
  photoIds: number[];
};

export type ConceptFolderResponse = {
  id: number;
  galleryId: number;
  name: string;
  sortOrder: number;
  createdSource: "AI" | "USER";
  analysisJobId: number | null;
  details: DetailFolderResponse[];
};

export type CategorizationJobResponse = {
  id: number;
  galleryId: number;
  mode: "INITIAL" | "INCREMENTAL";
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  processedPhotoCount: number;
  photos: {
    photoId: number;
    status: CategorizationPhotoStatus;
    failureCode: string | null;
    processedAt: string | null;
  }[];
};

export function listConceptFolders(galleryId: number): Promise<ConceptFolderResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders`);
}

export function materializeAnalysis(galleryId: number): Promise<ConceptFolderResponse[]> {
  return api(`/api/v1/galleries/${galleryId}/concept-folders/ai`, { method: "POST" });
}

export function runCategorization(galleryId: number): Promise<CategorizationJobResponse> {
  return api(`/api/v1/galleries/${galleryId}/categorization-jobs`, { method: "POST" });
}

export function getLatestCategorization(galleryId: number): Promise<CategorizationJobResponse> {
  return api(`/api/v1/galleries/${galleryId}/categorization-jobs/latest`);
}

export function moveCategoryPhotos(
  galleryId: number,
  photoIds: number[],
  targetDetailFolderId: number | null,
): Promise<void> {
  return api(`/api/v1/galleries/${galleryId}/category-assignments/move`, {
    method: "POST",
    body: { photoIds, targetDetailFolderId },
  });
}

/**
 * 작가 — 업로드 파일 행 (피그마 Item/UploadFileRow 대응)
 * 위치: src/app/(photographer)/galleries/[galleryId]/_components/UploadFileRow.tsx
 *
 * 로컬 미리보기 썸네일 + 파일명·용량 + 상태(대기/진행률/완료/실패/제외됨).
 * 진행 바는 4px 검정 — 로즈는 셀렉 전용 지표라 여기 쓰지 않는다.
 * 실패 행은 연한 붉은 배경으로 강조하고, 제외 행은 흐리게 남겨
 * "왜 안 올라가는지"가 그 자리에서 보이게 한다.
 */

import type { UploadEntry } from "../_lib/useUploadQueue";

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

function StateLabel({ entry }: { entry: UploadEntry }) {
  switch (entry.status) {
    case "waiting":
      return <span className="text-fg-neutral-subtle">대기</span>;
    case "uploading":
      return (
        <span className="text-fg-neutral-muted">
          {Math.round(entry.progress * 100)}%
        </span>
      );
    case "done":
      return <span className="text-fg-positive">✓ 완료</span>;
    case "failed":
      return <span className="font-medium text-fg-critical">실패</span>;
    case "excluded":
      return <span className="text-fg-critical">제외됨</span>;
  }
}

export function UploadFileRow({ entry }: { entry: UploadEntry }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-(--radius-8) p-2 ${
        entry.status === "failed" ? "bg-[#fdf3f3]" : ""
      } ${entry.status === "excluded" ? "opacity-55" : ""}`}
    >
      {entry.previewUrl ? (
        // 로컬 objectURL 미리보기 — 서버 왕복 없음
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.previewUrl}
          alt=""
          className="size-10 shrink-0 rounded-(--radius-4) object-cover"
        />
      ) : (
        <span className="size-10 shrink-0 rounded-(--radius-4) bg-bg-disabled" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2 type-body-small">
          <span
            className={`truncate ${
              entry.status === "failed" ? "text-fg-critical" : "text-fg-neutral"
            }`}
          >
            {entry.fileName}
          </span>
          <span className="shrink-0 text-fg-neutral-subtle">
            {formatSize(entry.size)}
          </span>
        </div>
        {entry.status === "uploading" && (
          <div className="h-1 w-full overflow-hidden rounded-(--pill) bg-bg-disabled">
            <div
              className="h-full rounded-(--pill) bg-bg-brand-solid"
              style={{ width: `${Math.round(entry.progress * 100)}%` }}
            />
          </div>
        )}
      </div>

      <span className="w-14 shrink-0 text-right type-body-small">
        <StateLabel entry={entry} />
      </span>
    </div>
  );
}

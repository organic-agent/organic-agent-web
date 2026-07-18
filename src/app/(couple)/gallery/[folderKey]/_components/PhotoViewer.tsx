/**
 * 부부 — 중앙 사진 뷰어
 * 위치: src/app/(couple)/gallery/[folderKey]/_components/PhotoViewer.tsx
 *
 * 현재 사진, 이전/다음 미리보기, 빈 필터 상태를 표시한다.
 */

import { photoUrl, type Photo } from "@/lib/couple";

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "이전 사진" : "다음 사진"}
      className="w-10 h-10 rounded-full border border-line grid place-items-center text-ink-2 bg-white hover:bg-paper-deep hover:text-ink transition-colors disabled:opacity-30 disabled:pointer-events-none shrink-0"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === "prev" ? (
          <path d="M15 18l-6-6 6-6" />
        ) : (
          <path d="M9 18l6-6-6-6" />
        )}
      </svg>
    </button>
  );
}

type Props = {
  photos: Photo[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  onShowAll: () => void;
};

export function PhotoViewer({
  photos,
  currentIndex,
  onChangeIndex,
  onShowAll,
}: Props) {
  const filteredTotal = photos.length;
  const photo = photos[currentIndex];
  const prev = currentIndex > 0 ? photos[currentIndex - 1] : null;
  const next = currentIndex < filteredTotal - 1 ? photos[currentIndex + 1] : null;

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center gap-4 px-6 py-6">
      {photos.length === 0 ? (
        <div className="text-center">
          <p className="text-[14px] text-ink-2 mb-1">
            현재 필터에 해당하는 사진이 없어요
          </p>
          <button
            type="button"
            onClick={onShowAll}
            className="text-[13px] text-accent hover:text-accent-press underline underline-offset-2"
          >
            전체 사진 보기
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 shrink-0">
            <ArrowButton
              direction="prev"
              disabled={!prev}
              onClick={() => onChangeIndex(Math.max(0, currentIndex - 1))}
            />
            <div className="w-16 aspect-[3/4] rounded-md overflow-hidden bg-paper-deep">
              {prev && (
                <button
                  onClick={() => onChangeIndex(Math.max(0, currentIndex - 1))}
                  className="w-full h-full"
                  aria-label="이전 사진 미리보기"
                >
                  <img
                    src={photoUrl(prev.photoId, 200)}
                    alt=""
                    className="w-full h-full object-cover opacity-60 hover:opacity-90 transition-opacity"
                  />
                </button>
              )}
            </div>
          </div>

          <div className="relative flex-1 min-w-0 h-full">
            <img
              src={photoUrl(photo.photoId, 1200)}
              alt={`사진 ${photo.id}`}
              className="absolute inset-0 w-full h-full object-contain"
            />
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[11px] text-white/90 bg-black/40 px-2.5 py-1 rounded-pill backdrop-blur-sm">
              #{String(photo.id).padStart(3, "0")} · {currentIndex + 1} /{" "}
              {filteredTotal}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-16 aspect-[3/4] rounded-md overflow-hidden bg-paper-deep">
              {next && (
                <button
                  onClick={() =>
                    onChangeIndex(Math.min(filteredTotal - 1, currentIndex + 1))
                  }
                  className="w-full h-full"
                  aria-label="다음 사진 미리보기"
                >
                  <img
                    src={photoUrl(next.photoId, 200)}
                    alt=""
                    className="w-full h-full object-cover opacity-60 hover:opacity-90 transition-opacity"
                  />
                </button>
              )}
            </div>
            <ArrowButton
              direction="next"
              disabled={!next}
              onClick={() =>
                onChangeIndex(Math.min(filteredTotal - 1, currentIndex + 1))
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

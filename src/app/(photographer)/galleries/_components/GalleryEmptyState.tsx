/**
 * 작가 — 갤러리 목록 빈 상태
 * 위치: src/app/(photographer)/galleries/_components/GalleryEmptyState.tsx
 *
 * 전체 갤러리가 없거나 현재 필터 결과가 없을 때 안내 화면을 보여준다.
 * 상황에 맞는 다음 액션 버튼을 함께 제공한다.
 *
 * 주요 책임:
 * - 전체 빈 상태 안내
 * - 필터 결과 없음 안내
 * - 새 갤러리 생성/전체 보기 액션 연결
 */

type Props =
  | {
      type: "empty";
      onCreateClick: () => void;
    }
  | {
      type: "filtered";
      onShowAll: () => void;
    };

export function GalleryEmptyState(props: Props) {
  if (props.type === "empty") {
    return (
      <div className="min-h-[360px] border border-dashed border-line-strong rounded-lg flex flex-col items-center justify-center text-center px-6">
        <div className="w-12 h-12 rounded-full border border-line-strong grid place-items-center text-ink-3 mb-4">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <h2 className="font-display-ko font-medium text-[18px] text-ink mb-2">
          아직 갤러리가 없어요
        </h2>
        <p className="text-[13px] text-ink-2 mb-5">
          첫 갤러리를 만들어 신혼부부를 초대해보세요.
        </p>
        <button
          type="button"
          onClick={props.onCreateClick}
          className="h-10 px-5 rounded-pill bg-ink text-on-ink text-[13px] font-medium hover:bg-[#333] transition-colors"
        >
          새 갤러리 만들기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[320px] border border-line rounded-lg flex flex-col items-center justify-center text-center px-6">
      <h2 className="font-display-ko font-medium text-[18px] text-ink mb-2">
        이 상태의 갤러리가 없어요
      </h2>
      <p className="text-[13px] text-ink-2 mb-5">
        다른 상태를 선택하거나 전체 목록을 확인해보세요.
      </p>
      <button
        type="button"
        onClick={props.onShowAll}
        className="h-10 px-5 rounded-pill border border-line text-[13px] font-medium text-ink-2 hover:bg-paper-deep transition-colors"
      >
        전체 보기
      </button>
    </div>
  );
}

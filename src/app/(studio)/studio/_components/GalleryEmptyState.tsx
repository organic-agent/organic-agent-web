/**
 * 작가 — 갤러리 목록 빈 상태
 * 위치: src/app/(studio)/studio/_components/GalleryEmptyState.tsx
 *
 * 전체 갤러리가 없거나 현재 필터 결과가 없을 때 안내 화면을 보여준다.
 * 상황에 맞는 다음 액션 버튼을 함께 제공한다.
 */

import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

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
      <div className="flex min-h-90 flex-col items-center justify-center rounded-(--radius-16) border-2 border-dashed border-border-default px-6 text-center">
        <span className="mb-4 grid size-12 place-items-center rounded-full border border-current text-contents-light-bgd-sub">
          <PlusIcon size={22} />
        </span>
        <h2 className="mb-2 type-title-m text-contents-light-bgd-default">
          아직 갤러리가 없어요
        </h2>
        <p className="mb-5 type-content-m text-contents-light-bgd-sub">
          첫 갤러리를 만들어 신혼부부를 초대해보세요.
        </p>
        <Button onClick={props.onCreateClick}>새 갤러리 만들기</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-(--radius-16) border border-divider-default px-6 text-center">
      <h2 className="mb-2 type-title-m text-contents-light-bgd-default">
        이 상태의 갤러리가 없어요
      </h2>
      <p className="mb-5 type-content-m text-contents-light-bgd-sub">
        다른 상태를 선택하거나 전체 목록을 확인해보세요.
      </p>
      <Button kind="ghost" onClick={props.onShowAll}>
        전체 보기
      </Button>
    </div>
  );
}

/**
 * 작가 — 갤러리 폼 필드
 * 위치: src/app/(photographer)/galleries/_components/GalleryFormFields.tsx
 *
 * 새 갤러리 생성 모달과 갤러리 수정 모달에서 공통으로 사용하는 입력 필드 묶음이다.
 * 폼 상태는 부모가 소유하고, 이 컴포넌트는 표시와 변경 이벤트만 담당한다.
 *
 * 주요 책임:
 * - 갤러리 기본 정보 입력 필드 렌더링
 * - 폼 값 변경 이벤트 전달
 * - 생성/수정 맥락에 맞는 도움말 표시
 */

import type { GalleryFormValues } from "../../_lib/galleryForm";

type Props = {
  values: GalleryFormValues;
  onChange: (values: GalleryFormValues) => void;
  namePlaceholder?: string;
  memoPlaceholder?: string;
  showDueDateHelp?: boolean;
  conceptHelpSpacingClassName?: string;
};

export function GalleryFormFields({
  values,
  onChange,
  namePlaceholder,
  memoPlaceholder,
  showDueDateHelp = false,
  conceptHelpSpacingClassName = "mb-4",
}: Props) {
  function update<K extends keyof GalleryFormValues>(
    key: K,
    value: GalleryFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <>
      <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
        갤러리 이름
      </label>
      <input
        type="text"
        value={values.name}
        onChange={(e) => update("name", e.target.value)}
        placeholder={namePlaceholder}
        className="w-full h-11 px-3.5 rounded-md border border-line text-sm text-ink outline-none focus:border-ink-3 mb-4 placeholder:text-ink-3"
      />

      <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
        완료 예정일
      </label>
      <input
        type="date"
        value={values.dueDate}
        onChange={(e) => update("dueDate", e.target.value)}
        className={`w-full h-11 px-3.5 rounded-md border border-line text-sm text-ink outline-none focus:border-ink-3 ${showDueDateHelp ? "mb-1.5" : "mb-4"}`}
      />
      {showDueDateHelp && (
        <p className="text-[11px] text-ink-3 mb-4">
          갤러리 접근이 만료되는 날짜예요. 기본값은 생성일로부터 50일 뒤이며,
          언제든 조정할 수 있어요.
        </p>
      )}

      <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
        목표 선택 장수
      </label>
      <input
        type="number"
        min={1}
        value={values.target}
        onChange={(e) => update("target", e.target.value)}
        placeholder="50"
        className="w-full h-11 px-3.5 rounded-md border border-line text-sm text-ink outline-none focus:border-ink-3 mb-4 placeholder:text-ink-3"
      />

      <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
        컨셉 개수 <span className="text-ink-3 font-normal">(선택)</span>
      </label>
      <input
        type="number"
        min={1}
        value={values.concept}
        onChange={(e) => update("concept", e.target.value)}
        placeholder="예: 4"
        className="w-full h-11 px-3.5 rounded-md border border-line text-sm text-ink outline-none focus:border-ink-3 mb-1.5 placeholder:text-ink-3"
      />
      <p className={`text-[11px] text-ink-3 ${conceptHelpSpacingClassName}`}>
        AI가 장면을 나눌 때 기준이 되는 컨셉 수예요.
      </p>

      <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
        특이사항 메모 <span className="text-ink-3 font-normal">(선택)</span>
      </label>
      <textarea
        rows={2}
        value={values.memo}
        onChange={(e) => update("memo", e.target.value)}
        placeholder={memoPlaceholder}
        className="w-full px-3.5 py-2.5 rounded-md border border-line text-sm text-ink outline-none focus:border-ink-3 mb-6 placeholder:text-ink-3 resize-none"
      />
    </>
  );
}

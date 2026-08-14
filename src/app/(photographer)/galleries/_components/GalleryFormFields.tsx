/**
 * 작가 — 갤러리 폼 필드
 * 위치: src/app/(photographer)/galleries/_components/GalleryFormFields.tsx
 *
 * 새 갤러리 생성 모달과 갤러리 수정 모달에서 공통으로 사용하는 입력 필드 묶음이다.
 * 폼 상태는 부모가 소유하고, 이 컴포넌트는 표시와 변경 이벤트만 담당한다 (TextField·Textarea 부품 사용).
 */

import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import type { GalleryFormValues } from "../../_lib/galleryForm";

type Props = {
  values: GalleryFormValues;
  onChange: (values: GalleryFormValues) => void;
  namePlaceholder?: string;
  memoPlaceholder?: string;
  showDueDateHelp?: boolean;
};

function FieldLabel({
  children,
  optional = false,
}: {
  children: string;
  optional?: boolean;
}) {
  return (
    <label className="mb-1.5 block type-label-button text-fg-neutral">
      {children}
      {optional && (
        <span className="ml-1 font-normal text-fg-neutral-muted">(선택)</span>
      )}
    </label>
  );
}

function FieldHint({ children }: { children: string }) {
  return (
    <p className="mt-1.5 type-body-small text-fg-neutral-muted">{children}</p>
  );
}

export function GalleryFormFields({
  values,
  onChange,
  namePlaceholder,
  memoPlaceholder,
  showDueDateHelp = false,
}: Props) {
  function update<K extends keyof GalleryFormValues>(
    key: K,
    value: GalleryFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <>
      <div className="mb-4">
        <FieldLabel>갤러리 이름</FieldLabel>
        <TextField
          value={values.name}
          onChange={(v) => update("name", v)}
          placeholder={namePlaceholder}
          aria-label="갤러리 이름"
          className="h-10"
        />
      </div>

      <div className="mb-4">
        <FieldLabel>완료 예정일</FieldLabel>
        <TextField
          type="date"
          value={values.dueDate}
          onChange={(v) => update("dueDate", v)}
          aria-label="완료 예정일"
          className="h-10"
        />
        {showDueDateHelp && (
          <FieldHint>
            갤러리 접근이 만료되는 날짜예요. 기본값은 생성일로부터 50일 뒤이며,
            언제든 조정할 수 있어요.
          </FieldHint>
        )}
      </div>

      <div className="mb-4">
        <FieldLabel>목표 선택 장수</FieldLabel>
        <TextField
          type="number"
          min={1}
          value={values.target}
          onChange={(v) => update("target", v)}
          placeholder="50"
          aria-label="목표 선택 장수"
          className="h-10"
        />
      </div>

      <div className="mb-4">
        <FieldLabel optional>컨셉 개수</FieldLabel>
        <TextField
          type="number"
          min={1}
          value={values.concept}
          onChange={(v) => update("concept", v)}
          placeholder="예: 4"
          aria-label="컨셉 개수"
          className="h-10"
        />
        <FieldHint>AI가 장면을 나눌 때 기준이 되는 컨셉 수예요.</FieldHint>
      </div>

      <div className="mb-6">
        <FieldLabel optional>특이사항 메모</FieldLabel>
        <Textarea
          value={values.memo}
          onChange={(v) => update("memo", v)}
          placeholder={memoPlaceholder}
          aria-label="특이사항 메모"
          className="h-18"
        />
      </div>
    </>
  );
}

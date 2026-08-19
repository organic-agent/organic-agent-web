/**
 * 작가 — 갤러리 폼 필드
 * 위치: src/app/(photographer)/galleries/_components/GalleryFormFields.tsx
 *
 * 새 갤러리 생성 모달과 갤러리 수정 모달에서 공통으로 사용하는 입력 필드
 * 묶음이다. 필드는 생성 계약의 세 값(이름·선택 마감 기한·계약 장수)이고,
 * 선택 입력의 힌트가 서버 null의 의미를 그대로 말해준다.
 * 폼 상태는 부모가 소유하고, 이 컴포넌트는 표시와 변경 이벤트만 담당한다.
 */

import { TextField } from "@/components/ui/TextField";
import {
  type GalleryFormValues,
  isPastDueDate,
} from "../../_lib/galleryForm";

type Props = {
  values: GalleryFormValues;
  onChange: (values: GalleryFormValues) => void;
  namePlaceholder?: string;
  /** 이름·마감 기한 잠금 — 수정 API(WES-216) 배포 전의 수정 모달용. */
  lockNameAndDueDate?: boolean;
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

function FieldHint({
  children,
  tone = "muted",
}: {
  children: string;
  tone?: "muted" | "critical";
}) {
  return (
    <p
      className={`mt-1.5 type-body-small ${
        tone === "critical" ? "text-fg-critical" : "text-fg-neutral-muted"
      }`}
    >
      {children}
    </p>
  );
}

export function GalleryFormFields({
  values,
  onChange,
  namePlaceholder,
  lockNameAndDueDate = false,
}: Props) {
  function update<K extends keyof GalleryFormValues>(
    key: K,
    value: GalleryFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  const pastDue = isPastDueDate(values.dueDate);

  return (
    <>
      <div className="mb-4">
        <FieldLabel>갤러리 이름</FieldLabel>
        <TextField
          value={values.name}
          onChange={(v) => update("name", v)}
          placeholder={namePlaceholder}
          disabled={lockNameAndDueDate}
          aria-label="갤러리 이름"
          className="h-10"
        />
      </div>

      <div className="mb-4">
        <FieldLabel optional>선택 마감 기한</FieldLabel>
        <TextField
          type="date"
          value={values.dueDate}
          onChange={(v) => update("dueDate", v)}
          error={pastDue}
          disabled={lockNameAndDueDate}
          aria-label="선택 마감 기한"
          className="h-10"
        />
        {pastDue ? (
          <FieldHint tone="critical">
            이미 지난 날짜예요. 마감 기한을 다시 확인해 주세요.
          </FieldHint>
        ) : (
          !lockNameAndDueDate && <FieldHint>비워두면 기한 없이 열려요.</FieldHint>
        )}
      </div>

      <div className="mb-6">
        <FieldLabel optional>계약 장수</FieldLabel>
        <TextField
          type="number"
          min={1}
          value={values.target}
          onChange={(v) => update("target", v)}
          placeholder="예: 50"
          aria-label="계약 장수"
          className="h-10"
        />
        <FieldHint>
          {lockNameAndDueDate
            ? "비워두면 제한이 없어져요. 이미 고른 장수보다 줄여도 저장돼요."
            : "비워두면 부부가 제한 없이 고를 수 있어요."}
        </FieldHint>
      </div>
    </>
  );
}

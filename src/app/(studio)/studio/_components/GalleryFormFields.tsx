/**
 * 작가 — 갤러리 폼 필드
 * 위치: src/app/(studio)/studio/_components/GalleryFormFields.tsx
 *
 * 새 갤러리 모달과 갤러리 수정 모달이 같이 쓰는 입력 묶음. 개인 갤러리 온보딩과 같은
 * 세 필드·같은 문구(갤러리 이름 · 선택 마감 · 고를 장수)이고, 선택 입력의 힌트가 서버 null의
 * 의미를 그대로 말해준다. 폼 상태는 부모가 소유하고, 여기서는 표시와 변경 이벤트만 맡는다.
 */

import { useId } from "react";
import { TextField } from "@/components/ui/TextField";
import {
  type GalleryFormValues,
  isPastDueDate,
} from "../../_lib/galleryForm";

type Props = {
  values: GalleryFormValues;
  onChange: (values: GalleryFormValues) => void;
  /** 힌트 문구 맥락 — 수정(edit)은 "제한이 없어져요"처럼 변경 결과를 말한다. */
  mode?: "create" | "edit";
};

function FieldLabel({
  htmlFor,
  children,
  optional = false,
}: {
  htmlFor: string;
  children: string;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block type-label-medium-m text-contents-light-bgd-default"
    >
      {children}
      {optional && (
        <span className="ml-1 font-normal text-contents-light-bgd-sub">(선택)</span>
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
      className={`mt-1.5 type-content-xs ${
        tone === "critical" ? "text-function-error-default" : "text-contents-light-bgd-sub"
      }`}
    >
      {children}
    </p>
  );
}

export function GalleryFormFields({ values, onChange, mode = "create" }: Props) {
  const id = useId();
  function update<K extends keyof GalleryFormValues>(
    key: K,
    value: GalleryFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  const pastDue = isPastDueDate(values.dueDate);
  const targetNumber = Number(values.target);
  const targetValid =
    values.target.trim() === "" ||
    (Number.isInteger(targetNumber) && targetNumber >= 1);

  return (
    <div className="mb-6 flex flex-col gap-5">
      <div>
        <FieldLabel htmlFor={`${id}-title`}>갤러리 이름</FieldLabel>
        <TextField
          id={`${id}-title`}
          value={values.name}
          onChange={(v) => update("name", v)}
          placeholder="예: 수민 & 지호 본식 원본"
          className="h-12 px-4"
        />
      </div>

      <div>
        <FieldLabel htmlFor={`${id}-deadline`} optional>
          선택 마감
        </FieldLabel>
        <TextField
          id={`${id}-deadline`}
          type="date"
          value={values.dueDate}
          onChange={(v) => update("dueDate", v)}
          error={pastDue}
          className="h-12 px-4"
        />
        {pastDue ? (
          <FieldHint tone="critical">
            이미 지난 날짜예요. 마감 기한을 다시 확인해 주세요
          </FieldHint>
        ) : (
          <FieldHint>비우면 기한 없이 열려 있어요</FieldHint>
        )}
      </div>

      <div>
        <FieldLabel htmlFor={`${id}-count`} optional>
          고를 장수
        </FieldLabel>
        <TextField
          id={`${id}-count`}
          type="number"
          min={1}
          value={values.target}
          onChange={(v) => update("target", v)}
          placeholder="예: 300"
          error={!targetValid}
          className="h-12 px-4"
        />
        {targetValid ? (
          <FieldHint>
            {mode === "edit"
              ? "비우면 제한이 없어져요. 이미 고른 장수보다 줄여도 저장돼요"
              : "비우면 제한 없음"}
          </FieldHint>
        ) : (
          <FieldHint tone="critical">1 이상의 정수를 입력해 주세요</FieldHint>
        )}
      </div>
    </div>
  );
}

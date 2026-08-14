"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";

const QNA_DATA = [
  {
    q: "사진을 여러 장 한 번에 올릴 수 있나요?",
    a: "네, 이미지 파일을 여러 장 선택하거나 끌어다 놓아 한 번에 업로드할 수 있습니다.",
  },
  {
    q: "사진작가가 아니어도 사용할 수 있나요?",
    a: "네, 예비부부도 직접 갤러리를 만들고 사진을 업로드할 수 있습니다. 다만 대부분의 경우 사진작가가 갤러리를 생성하고 부부를 초대하는 방식으로 진행됩니다.",
  },
  {
    q: "어떤 파일 형식을 지원하나요?",
    a: "지원 파일 형식과 최대 용량은 실제 업로드 기능 연동 후 안내할 예정입니다.",
  },
  {
    q: "가격은 얼마인가요?",
    a: "현재 정식 출시를 준비 중이며, 웨이트리스트에 합류하시면 출시 소식과 함께 얼리버드 가격을 안내드립니다.",
  },
  {
    q: "보정 요청도 여기서 할 수 있나요?",
    a: "네, 선택한 사진 위에 핀을 찍고 코멘트를 남기면 사진작가에게 보정 요청이 정리되어 전달됩니다.",
  },
];

export function QnAAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="w-full max-w-170 mx-auto border-t border-stroke-neutral-muted">
      {QNA_DATA.map((item, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={i} className="border-b border-stroke-neutral-muted">
            <button
              className="w-full flex items-center justify-between py-5 gap-4 text-left type-label-large text-fg-neutral cursor-pointer hover:text-fg-neutral-muted transition-colors duration-fast"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              {item.q}
              <PlusIcon
                className={`shrink-0 transition-transform duration-base ease-out ${isOpen ? "rotate-45" : ""}`}
              />
            </button>

            <div
              className={`qna-answer-base ${isOpen ? "qna-answer-open" : ""}`}
            >
              <p className="pb-5 text-left type-body-large text-fg-neutral-muted">
                {item.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

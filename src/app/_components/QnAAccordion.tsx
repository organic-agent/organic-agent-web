"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";

const QNA_DATA = [
  {
    q: "한 계정으로 여러 갤러리를 볼 수 있나요?",
    a: "네. 초대받은 갤러리, 직접 만든 갤러리, 스튜디오 작업 공간이 한 계정에 모입니다. 프로필 메뉴에서 오갈 수 있습니다.",
  },
  {
    q: "초대받은 클라이언트도 회원가입이 필요한가요?",
    a: "네, 링크를 열고 소셜 로그인 한 번이면 됩니다. 갤러리는 자동으로 연결됩니다. 공유 링크로 의견을 남기는 가족·지인은 가입 없이 바로 볼 수 있습니다.",
  },
  {
    q: "사진을 여러 장 한 번에 올릴 수 있나요?",
    a: "네, 이미지 파일을 여러 장 선택하거나 끌어다 놓아 한 번에 업로드할 수 있습니다.",
  },
  {
    q: "가족이나 파트너와 함께 고를 수 있나요?",
    a: "네. 파트너를 초대하면 같은 갤러리에서 함께 고르고, 공유 링크로 가족·지인의 좋아요와 댓글을 모을 수 있습니다.",
  },
  {
    q: "보정 요청도 여기서 할 수 있나요?",
    a: "네, 선택한 사진 위에 핀을 찍고 코멘트를 남기면 사진작가에게 보정 요청이 정리되어 전달됩니다.",
  },
  {
    q: "사진작가가 아니어도 사용할 수 있나요?",
    a: "네. 스튜디오 없이도 내 갤러리를 만들어 받은 원본을 직접 올리고 고를 수 있습니다. 무료 한도까지는 결제 없이 시작합니다.",
  },
];

export function QnAAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="w-full max-w-170 mx-auto border-t border-divider-default">
      {QNA_DATA.map((item, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={i} className="border-b border-divider-default">
            <button
              className="w-full flex items-center justify-between py-5 gap-4 text-left type-label-medium-l text-contents-light-bgd-default cursor-pointer hover:text-contents-light-bgd-sub transition-colors duration-fast"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              {item.q}
              <PlusIcon
                className={`shrink-0 transition-[transform,color] duration-base ease-out ${isOpen ? "rotate-45 text-brand-secondary-default" : ""}`}
              />
            </button>

            <div
              className={`qna-answer-base ${isOpen ? "qna-answer-open" : ""}`}
            >
              <p className="pb-5 text-left type-content-l text-contents-light-bgd-sub">
                {item.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

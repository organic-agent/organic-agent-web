/**
 * 이용약관 페이지 (초안)
 * 위치: src/app/(legal)/terms/page.tsx
 *
 * 표준 서비스 약관 골격의 초안이다. [ ] 표시는 사업자 정보·정책 확정 후 채운다.
 * 정식 시행 전 반드시 법률 검토를 거칠 것.
 */

import type { Metadata } from "next";
import {
  DraftNotice,
  LegalArticle,
  LegalTitle,
} from "../_components/LegalSection";

export const metadata: Metadata = {
  title: "이용약관 — Easy Select",
};

export default function TermsPage() {
  return (
    <article>
      <LegalTitle title="이용약관" effectiveDate="[YYYY.MM.DD]" />
      <DraftNotice />

      <LegalArticle title="제1조 (목적)">
        <p>
          이 약관은 [회사명](이하 &ldquo;회사&rdquo;)이 제공하는 사진 셀렉·공유
          서비스 &ldquo;Easy Select&rdquo;(이하 &ldquo;서비스&rdquo;)의 이용과
          관련하여 회사와 회원의 권리·의무 및 책임 사항, 기타 필요한 사항을
          규정함을 목적으로 합니다.
        </p>
      </LegalArticle>

      <LegalArticle title="제2조 (정의)">
        <ol>
          <li>
            &ldquo;회원&rdquo;이란 이 약관에 동의하고 회사와 서비스 이용 계약을
            체결한 자를 말하며, 사진을 업로드·전달하는 &ldquo;작가
            회원&rdquo;과 사진을 선택·요청하는 &ldquo;고객 회원&rdquo;으로
            구분됩니다.
          </li>
          <li>
            &ldquo;게스트&rdquo;란 회원이 공유한 링크를 통해 갤러리를
            열람하거나 의견을 남기는 자를 말합니다.
          </li>
          <li>
            &ldquo;갤러리&rdquo;란 회원이 사진을 업로드·공유·선택하기 위해
            서비스 내에 생성하는 저장 공간을 말합니다.
          </li>
          <li>
            &ldquo;콘텐츠&rdquo;란 회원 또는 게스트가 서비스에 게시한 사진,
            댓글, 별점 등 일체의 정보를 말합니다.
          </li>
        </ol>
      </LegalArticle>

      <LegalArticle title="제3조 (약관의 게시와 개정)">
        <ol>
          <li>
            회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 화면에
            게시합니다.
          </li>
          <li>
            회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수
            있으며, 개정 시 적용일자와 개정 사유를 명시하여 적용일 [7]일 전부터
            공지합니다. 회원에게 불리한 변경은 [30]일 전부터 공지합니다.
          </li>
          <li>
            회원이 개정 약관 적용일까지 거부 의사를 표시하지 않고 서비스를 계속
            이용하는 경우 개정 약관에 동의한 것으로 봅니다.
          </li>
        </ol>
      </LegalArticle>

      <LegalArticle title="제4조 (서비스의 제공 및 변경)">
        <ol>
          <li>
            회사는 다음의 서비스를 제공합니다: 사진 업로드 및 갤러리 생성,
            갤러리 공유 및 초대, 사진 비교·선택(셀렉), 보정 요청 전달, 좋아요·
            댓글 등 협업 기능, 기타 회사가 정하는 서비스.
          </li>
          <li>
            회사는 운영상·기술상 필요에 따라 제공하는 서비스의 전부 또는 일부를
            변경할 수 있으며, 중요한 변경은 사전에 공지합니다.
          </li>
        </ol>
      </LegalArticle>

      <LegalArticle title="제5조 (회원가입)">
        <ol>
          <li>
            회원가입은 카카오·네이버·구글 등 소셜 계정 인증을 통해 이루어지며,
            이 약관에 동의한 때에 이용 계약이 성립합니다.
          </li>
          <li>
            회사는 타인의 명의 또는 정보를 도용한 경우, 서비스 운영을 고의로
            방해한 이력이 있는 경우 등에는 가입을 거절하거나 사후에 이용 계약을
            해지할 수 있습니다.
          </li>
        </ol>
      </LegalArticle>

      <LegalArticle title="제6조 (회원의 의무)">
        <ol>
          <li>
            회원은 자신이 정당한 권리를 보유하지 않은 사진 등 콘텐츠를
            업로드해서는 안 됩니다.
          </li>
          <li>
            회원은 타인의 개인정보를 침해하거나, 서비스의 정상적인 운영을
            방해하는 행위를 해서는 안 됩니다.
          </li>
          <li>
            회원은 관계 법령, 이 약관, 이용 안내 등 회사가 공지한 사항을
            준수해야 합니다.
          </li>
        </ol>
      </LegalArticle>

      <LegalArticle title="제7조 (콘텐츠의 권리)">
        <ol>
          <li>
            회원이 업로드한 사진의 저작권은 촬영자 등 원저작권자에게 있습니다.
            서비스 이용이 저작권의 이전을 의미하지 않습니다.
          </li>
          <li>
            회사는 서비스의 제공·운영·개선을 위해 필요한 범위에서만 콘텐츠를
            저장·전송·표시할 수 있습니다.
          </li>
          <li>
            작가 회원과 고객 회원 간 사진의 이용 범위·전달 조건 등은 당사자 간
            계약에 따르며, 회사는 그 계약의 당사자가 아닙니다.
          </li>
        </ol>
      </LegalArticle>

      <LegalArticle title="제8조 (서비스의 중단)">
        <p>
          회사는 시스템 점검·교체, 통신 두절, 천재지변 등 부득이한 사유가 있는
          경우 서비스 제공을 일시 중단할 수 있으며, 사전 또는 사후에
          공지합니다.
        </p>
      </LegalArticle>

      <LegalArticle title="제9조 (계약 해지 및 이용 제한)">
        <ol>
          <li>
            회원은 언제든지 서비스 내 계정 관리 기능을 통해 이용 계약을 해지
            (탈퇴)할 수 있습니다.
          </li>
          <li>
            회사는 회원이 이 약관을 위반한 경우 사전 통지 후 서비스 이용을
            제한하거나 계약을 해지할 수 있습니다. 다만 긴급한 경우 사후에
            통지할 수 있습니다.
          </li>
        </ol>
      </LegalArticle>

      <LegalArticle title="제10조 (면책)">
        <ol>
          <li>
            회사는 천재지변 또는 이에 준하는 불가항력으로 서비스를 제공할 수
            없는 경우 책임이 면제됩니다.
          </li>
          <li>
            회사는 회원의 귀책 사유로 인한 서비스 이용 장애, 회원 상호 간 또는
            회원과 게스트 간 분쟁에 대해 책임을 지지 않습니다.
          </li>
        </ol>
      </LegalArticle>

      <LegalArticle title="제11조 (준거법 및 재판 관할)">
        <p>
          이 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련하여
          분쟁이 발생한 경우 민사소송법상의 관할 법원에 제소합니다.
        </p>
      </LegalArticle>

      <LegalArticle title="부칙">
        <p>이 약관은 [YYYY.MM.DD]부터 시행합니다.</p>
      </LegalArticle>
    </article>
  );
}

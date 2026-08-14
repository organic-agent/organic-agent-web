/**
 * 개인정보처리방침 페이지 (초안)
 * 위치: src/app/(legal)/privacy/page.tsx
 *
 * 표준 개인정보처리방침 골격의 초안이다. [ ] 표시는 사업자 정보·정책 확정 후 채운다.
 * 소셜 로그인(OAuth) 심사 제출용 URL로도 사용된다. 정식 시행 전 법률 검토 필수.
 */

import type { Metadata } from "next";
import {
  DraftNotice,
  LegalArticle,
  LegalTitle,
} from "../_components/LegalSection";

export const metadata: Metadata = {
  title: "개인정보처리방침 — Easy Select",
};

export default function PrivacyPage() {
  return (
    <article>
      <LegalTitle title="개인정보처리방침" effectiveDate="[YYYY.MM.DD]" />
      <DraftNotice />

      <LegalArticle title="1. 수집하는 개인정보의 항목 및 방법">
        <ol>
          <li>
            소셜 로그인(카카오·네이버·구글) 시: 이메일 주소, 이름 또는 닉네임,
            프로필 이미지, 소셜 계정 식별자.
          </li>
          <li>
            서비스 이용 과정에서 자동 수집: 접속 일시, IP 주소, 기기·브라우저
            정보, 서비스 이용 기록, 쿠키.
          </li>
          <li>
            회원이 직접 입력·업로드하는 정보: 스튜디오·갤러리 정보, 사진,
            댓글·별점·보정 요청 내용.
          </li>
        </ol>
      </LegalArticle>

      <LegalArticle title="2. 개인정보의 이용 목적">
        <ul>
          <li>회원 식별, 가입 의사 확인 및 계정 관리</li>
          <li>사진 업로드·공유·셀렉 등 서비스 제공 및 운영</li>
          <li>공지 전달, 문의·불만 처리</li>
          <li>서비스 개선을 위한 통계 분석 (개인 식별이 불가능한 형태)</li>
        </ul>
      </LegalArticle>

      <LegalArticle title="3. 개인정보의 보유 및 이용 기간">
        <ol>
          <li>
            회원 탈퇴 시 지체 없이 파기합니다. 다만 관계 법령에 따라 보존이
            필요한 경우 해당 기간 동안 보관합니다.
          </li>
          <li>
            전자상거래 등에서의 소비자 보호에 관한 법률: 계약·청약철회 기록
            5년, 대금 결제·재화 공급 기록 5년, 소비자 불만·분쟁 처리 기록 3년.
          </li>
          <li>통신비밀보호법: 접속 기록(로그) 3개월.</li>
        </ol>
      </LegalArticle>

      <LegalArticle title="4. 개인정보의 제3자 제공">
        <p>
          회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만
          이용자가 사전에 동의한 경우, 법령의 규정에 의하거나 수사 목적으로
          법령에 정해진 절차와 방법에 따라 수사기관이 요구하는 경우에는
          예외로 합니다.
        </p>
      </LegalArticle>

      <LegalArticle title="5. 개인정보 처리의 위탁">
        <p>
          회사는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하며,
          위탁 계약 시 개인정보 보호 관련 법령 준수를 명시합니다.
        </p>
        <ul>
          <li>[클라우드 사업자명(예: Amazon Web Services)] — 데이터 보관 및 인프라 운영</li>
          <li>[기타 수탁자] — [위탁 업무 내용]</li>
        </ul>
      </LegalArticle>

      <LegalArticle title="6. 정보주체의 권리와 행사 방법">
        <ol>
          <li>
            이용자는 언제든지 자신의 개인정보에 대해 열람·정정·삭제·처리 정지를
            요구할 수 있습니다.
          </li>
          <li>
            권리 행사는 서비스 내 계정 관리 기능 또는 아래 개인정보
            보호책임자에게 서면·이메일로 요청할 수 있으며, 회사는 지체 없이
            조치합니다.
          </li>
        </ol>
      </LegalArticle>

      <LegalArticle title="7. 개인정보의 파기 절차 및 방법">
        <p>
          보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이
          파기합니다. 전자적 파일은 복구할 수 없는 방법으로 삭제하고, 출력물은
          분쇄 또는 소각합니다.
        </p>
      </LegalArticle>

      <LegalArticle title="8. 개인정보의 안전성 확보 조치">
        <ul>
          <li>개인정보 전송 구간 암호화(TLS) 및 중요 정보 암호화 저장</li>
          <li>접근 권한의 최소화 및 접근 기록 보관</li>
          <li>보안 프로그램 설치·갱신 등 기술적 보호 조치</li>
        </ul>
      </LegalArticle>

      <LegalArticle title="9. 개인정보 보호책임자">
        <ul>
          <li>성명: [이름]</li>
          <li>직책: [직책]</li>
          <li>연락처: [이메일 주소]</li>
        </ul>
        <p>
          개인정보 관련 문의·불만·피해 구제는 위 연락처로 접수할 수 있으며,
          개인정보분쟁조정위원회(1833-6972), 개인정보침해신고센터(118)에도
          문의할 수 있습니다.
        </p>
      </LegalArticle>

      <LegalArticle title="10. 고지의 의무">
        <p>
          이 방침의 내용이 추가·삭제·수정될 경우 시행 [7]일 전부터 서비스 내
          공지사항을 통해 알립니다.
        </p>
      </LegalArticle>

      <LegalArticle title="부칙">
        <p>이 방침은 [YYYY.MM.DD]부터 시행합니다.</p>
      </LegalArticle>
    </article>
  );
}

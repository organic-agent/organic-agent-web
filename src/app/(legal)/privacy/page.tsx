/**
 * 개인정보 처리방침 페이지
 * 위치: src/app/(legal)/privacy/page.tsx
 *
 * 「개인정보 보호법」 제30조의 처리방침. 수집 항목 · 위탁 · 보관 기간은 실제 코드와 서버 설정을 따라 적었다
 * (소셜 로그인은 닉네임 · 이메일만, 삭제 뒤 7일, 보관은 서울 리전). 서비스가 받는 정보나 맡기는 곳이 바뀌면 여기도 고친다.
 * 소셜 로그인(OAuth) 심사 제출용 주소로도 쓴다. 날짜 · 책임자 · 보관 기간은 2026-10-04 확정값(이슈 87).
 */

import type { Metadata } from "next";
import {
  LegalArticle,
  LegalLabel,
  LegalSubheading,
  LegalTable,
  LegalTitle,
} from "../_components/LegalSection";

export const metadata: Metadata = {
  title: "개인정보 처리방침 — Easy Select",
};

export default function PrivacyPage() {
  return (
    <article>
      <LegalTitle title="개인정보 처리방침" dateLabel="최종 수정일" effectiveDate="2026년 10월 6일" />

      <p className="mb-10 type-content-m leading-relaxed text-contents-light-bgd-sub">
        Easy Select(이하 &ldquo;서비스&rdquo;)는 「개인정보 보호법」 제30조에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.
      </p>

      <LegalArticle title="1. 개인정보의 수집 항목 및 수집 방법">
        <LegalSubheading>1.1 수집 항목</LegalSubheading>
        <LegalLabel>회원가입 시 수집하는 정보</LegalLabel>
        <ul>
          <li>소셜 로그인(카카오·네이버·구글) 계정의 식별 정보</li>
          <li>닉네임(프로필 이름)</li>
          <li>이메일 주소(소셜 계정에서 제공에 동의한 경우)</li>
        </ul>
        <LegalLabel>서비스를 이용하면서 이용자가 입력하거나 올리는 정보</LegalLabel>
        <ul>
          <li>작가의 스튜디오 이름과 공개 주소</li>
          <li>갤러리 이름, 선택 마감일, 고를 사진 수</li>
          <li>올린 사진과 파일 이름. 사진에는 촬영된 사람의 모습이 담길 수 있습니다</li>
          <li>사진 선택 내역, 별점, 보정 요청 내용</li>
          <li>쿠폰 등록 내역</li>
        </ul>
        <LegalLabel>공유 링크로 들어온 게스트(비회원)의 정보</LegalLabel>
        <ul>
          <li>입장할 때 입력하는 이름</li>
          <li>사진에 남긴 좋아요와 댓글</li>
        </ul>
        <LegalLabel>서비스 이용 과정에서 자동으로 생성·수집되는 정보</LegalLabel>
        <ul>
          <li>서비스 이용 기록, 접속 일시, 접속 IP, 기기 및 브라우저 정보</li>
          <li>로그인 유지와 화면 설정을 위한 쿠키 및 브라우저 저장소 값</li>
          <li>사진을 분석해 만든 분류, 점수, 추천 정보</li>
        </ul>
        <LegalSubheading>1.2 수집 방법</LegalSubheading>
        <ul>
          <li>소셜 로그인(카카오, 네이버, 구글) API를 통한 제공</li>
          <li>회원가입 및 서비스 이용 과정에서 이용자가 직접 입력하거나 업로드</li>
          <li>서비스 이용 과정에서 자동 생성·수집</li>
        </ul>

      </LegalArticle>

      <LegalArticle title="2. 개인정보의 수집 및 이용 목적">
        <p>서비스는 수집한 개인정보를 다음의 목적으로 이용합니다.</p>
        <ul>
          <li>회원 식별, 로그인 유지 및 계정 관리</li>
          <li>갤러리 제공: 사진 업로드와 보관, 사진 선택(셀렉), 보정 요청 전달과 결과 확인</li>
          <li>사진 분석: 올린 사진을 자동으로 분류하고 추천 사진과 그 이유를 제공</li>
          <li>초대와 공유: 작가와 고객, 게스트에게 갤러리를 보여 주고 반응을 모음</li>
          <li>이용권과 쿠폰의 등록, 이용 기간 관리</li>
          <li>서비스 안의 알림 제공, 문의 및 고객 지원</li>
          <li>부정 이용 방지 및 서비스 안정성 확보</li>
          <li>서비스 개선을 위한 통계 분석(개인을 알아볼 수 없는 형태)</li>
        </ul>
      </LegalArticle>

      <LegalArticle title="3. 개인정보의 보유 및 이용 기간">
        <ul>
          <li>회원 탈퇴 시: 지체 없이 파기합니다. 탈퇴하면 소유한 스튜디오와 그 안의 갤러리·사진이 함께 삭제되고, 다른 스튜디오 소속과 갤러리 참여는 해제됩니다.</li>
          <li>이용자가 삭제한 사진과 갤러리: 삭제한 날부터 7일이 지나면 복구할 수 없게 지웁니다.</li>
          <li>이용 기간이 끝난 갤러리: 이용 기간이 끝난 날부터 30일간 보관한 뒤 삭제합니다.</li>
          <li>게스트가 남긴 이름, 좋아요, 댓글: 해당 갤러리 또는 공유 링크가 삭제될 때까지 보관합니다.</li>
          <li>법령에 따른 보관: 관련 법령이 정한 기간 동안 보관합니다.
            <ul>
              <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
              <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
              <li>서비스 접속 기록: 3개월</li>
            </ul>
          </li>
        </ul>

      </LegalArticle>

      <LegalArticle title="4. 개인정보의 제3자 제공">
        <p>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 다음의 경우는 예외로 합니다.</p>
        <ul>
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
        </ul>
        <p>이용자가 초대하거나 공유 링크를 보낸 상대(작가, 고객, 게스트)는 해당 갤러리의 사진과 반응을 볼 수 있습니다. 이는 이용자가 서비스의 기능으로 직접 공유한 것입니다.</p>

      </LegalArticle>

      <LegalArticle title="5. 개인정보 처리 위탁">
        <p>서비스는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
        <LegalTable>
          <thead><tr><th>수탁업체</th><th>위탁 업무 내용</th></tr></thead>
          <tbody>
            <tr><td>Amazon Web Services</td><td>데이터 보관, 서버 운영, 사진 분석 처리</td></tr>
            <tr><td>Vercel</td><td>웹 화면 제공(호스팅)</td></tr>
            <tr><td>카카오</td><td>소셜 로그인 인증</td></tr>
            <tr><td>네이버</td><td>소셜 로그인 인증</td></tr>
            <tr><td>구글</td><td>소셜 로그인 인증</td></tr>
          </tbody>
        </LegalTable>
        <p>위탁 업체가 바뀌면 이 개인정보 처리방침을 통해 알립니다.</p>

      </LegalArticle>

      <LegalArticle title="6. 개인정보의 국외 이전">
        <p>서비스는 이용자의 데이터를 국내(서울)에 있는 클라우드 서버에 보관합니다. 다만 아래 업무는 국외 사업자의 설비에서 처리될 수 있습니다.</p>
        <LegalTable>
          <thead><tr><th>이전받는 자</th><th>이전 항목</th><th>이전 목적</th></tr></thead>
          <tbody>
            <tr><td>Vercel Inc.(미국)</td><td>접속 IP, 기기 및 브라우저 정보</td><td>웹 화면 제공</td></tr>
            <tr><td>Amazon Web Services, Inc.</td><td>사진</td><td>사진 분석</td></tr>
          </tbody>
        </LegalTable>

      </LegalArticle>

      <LegalArticle title="7. 정보주체의 권리·의무 및 행사 방법">
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>개인정보 열람 요구</li>
          <li>개인정보 정정·삭제 요구</li>
          <li>개인정보 처리 정지 요구</li>
          <li>회원 탈퇴(동의 철회)</li>
        </ul>
        <p>닉네임 변경과 회원 탈퇴는 서비스의 설정 메뉴에서 직접 할 수 있습니다. 그 밖의 요청은 개인정보 보호책임자의 이메일(asmorganicagent@gmail.com)로 보낼 수 있으며, 서비스는 지체 없이 조치합니다.</p>
        <p>게스트는 자신이 입력한 이름을 바꾸고, 자신이 남긴 댓글을 지울 수 있습니다.</p>

      </LegalArticle>

      <LegalArticle title="8. 개인정보의 파기">
        <p>서비스는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때 지체 없이 해당 개인정보를 파기합니다.</p>
        <LegalLabel>파기 절차</LegalLabel>
        <ul><li>이용자가 입력하거나 올린 정보는 목적 달성 후 이 방침과 관련 법령에 따라 일정 기간 저장한 뒤 파기합니다.</li></ul>
        <LegalLabel>파기 방법</LegalLabel>
        <ul>
          <li>전자적 파일 형태: 복구할 수 없는 방법으로 영구 삭제</li>
          <li>종이 문서: 분쇄 또는 소각</li>
        </ul>

      </LegalArticle>

      <LegalArticle title="9. 개인정보의 안전성 확보 조치">
        <ul>
          <li>모든 통신 구간을 암호화합니다(HTTPS).</li>
          <li>사진은 일정 시간만 유효한 주소로 제공하여, 주소가 알려지더라도 계속 열람할 수 없게 합니다.</li>
          <li>개인정보에 접근할 수 있는 사람을 최소한으로 제한합니다.</li>
        </ul>

      </LegalArticle>

      <LegalArticle title="10. 쿠키와 브라우저 저장소">
        <ul>
          <li>서비스는 로그인 상태를 유지하고 화면 설정(화면 테마, 사이드바, 사진 크기 등)을 기억하기 위해 쿠키와 브라우저 저장소를 사용합니다.</li>
          <li>광고나 이용자 추적을 위한 쿠키는 사용하지 않습니다.</li>
          <li>이용자는 브라우저 설정에서 저장을 거부할 수 있습니다. 이 경우 로그인 유지 등 일부 기능을 쓸 수 없습니다.</li>
        </ul>

      </LegalArticle>

      <LegalArticle title="11. 개인정보 보호책임자">
        <p>서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
        <ul>
          <li>성명: 강형준</li>
          <li>이메일: asmorganicagent@gmail.com</li>
        </ul>
        <p>개인정보 침해에 대한 신고나 상담이 필요하신 경우 아래 기관에 문의하실 수 있습니다.</p>
        <ul>
          <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
          <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
          <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
          <li>경찰청: (국번없이) 182 (ecrm.police.go.kr)</li>
        </ul>

      </LegalArticle>

      <LegalArticle title="12. 개인정보 처리방침의 변경">
        <p>이 개인정보 처리방침은 법령·정책 또는 보안 기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 때 시행일 최소 7일 전에 서비스 안에서 알립니다.</p>
        <ul>
          <li>공고일자: 2026년 10월 6일</li>
          <li>시행일자: 2026년 10월 6일</li>
        </ul>

      </LegalArticle>
    </article>
  );
}

/**
 * 이벤트 사전 — 이름과 속성의 정본. 설계 문서의 표와 1:1
 * 위치: src/lib/analytics/events.ts
 *
 * 규칙: 소문자 snake_case · 과거형 · "서버가 성공을 돌려준 직후"에만 기록. 세부는 이름이 아니라 속성으로.
 * 여기 없는 이름으로 track()을 부르면 컴파일이 실패한다 — 새 이벤트는 먼저 여기에 적고 설계 문서도 같이 고친다.
 * 화면 이동(page_view)은 이벤트가 아니라 어댑터의 page() 호출이라 이 표에 없다.
 * 보내지 않는 것: 이메일 · 닉네임 · 초대/협업 토큰 · 쿠폰 코드 · 사진 URL · 보정 요청 문장.
 */

import type { OAuthProvider } from "@/lib/api/auth";
import type { CouponUsagePolicy } from "@/lib/api/payments";

type Actor = "personal" | "studio";

export type EventMap = {
  // ── 공통(모든 사용자) ─────────────────────────────────────────────
  /** 새 계정이 처음 생김. 퍼널의 출발점이자 코호트의 기준 날짜 */
  signup_completed: { provider: OAuthProvider };
  /** 기존 계정의 재로그인 */
  login_completed: { provider: OAuthProvider };
  /** 역할 화면에서 어느 흐름으로 들어가는지 */
  role_selected: { role: "studio" | "personal" | "couple" };
  /** 초대 링크로 합류 */
  invite_accepted: { kind: "client" | "partner" };
  /** 알림을 열어 봄 */
  notification_opened: { kind: string; count: number };
  /** 카카오 채널 문의 링크 클릭(외부 이동이라 성공 응답 없음) */
  support_chat_clicked: { from: "landing" | "profile_menu" };
  /** 코치마크를 끝까지 봄 / 중간에 닫음 */
  coachmark_finished: { flow: string; step: number };
  coachmark_skipped: { flow: string; step: number };
  /** 탈퇴 */
  account_deleted: { workspace_kinds: readonly string[] };

  // ── 개인 결제 고객 · 우선 1 ──────────────────────────────────────
  /** 개인 온보딩에서 Free 또는 Pro를 고름 */
  plan_selected: { plan: "free" | "pro" };
  /**
   * Pro 쿠폰 등록 성공(같은 계정의 재등록은 제외). 1회용 비밀 코드는 서버가 준 쿠폰 ID만 싣고, 관리자가 지은 공유
   * 코드(인플루언서 배포, #138)는 글에 공개된 값이라 코드도 싣는다 — 인플루언서별 성과는 coupon_code로 본다
   */
  pro_coupon_registered: { coupon_id: number; usage_policy: CouponUsagePolicy; coupon_code: string | null };
  /** 개인 갤러리 생성 — 개인 고객 퍼널의 결제 단계에 해당 */
  personal_gallery_created: {
    plan: "free" | "pro";
    has_coupon: boolean;
    target_count: number | null;
    days_to_event: number | null;
  };
  /** 사진 업로드 끝. 개인과 작가가 같은 훅을 쓰므로 actor로 구분 */
  upload_completed: { gallery_id: number; photo_count: number; actor: Actor; duration_sec: number | null };
  /** AI 컨셉 분석 요청 */
  ai_analysis_requested: { gallery_id: number; concept_count: number | null; actor: Actor };
  /** AI가 나눈 폴더를 확정. folder_count는 컨셉 폴더, detail_count는 그 아래 세부 폴더 수 */
  concept_folders_confirmed: { gallery_id: number; folder_count: number; detail_count: number; photo_count: number };
  /** 사진에 별점(셀렉 화면은 싱글뷰에서만 매긴다). 지우기는 score 0 */
  photo_rated: { gallery_id: number; score: number };
  /** 셀렉 제출 — 첫 핵심 가치 도달 */
  selection_submitted: {
    gallery_id: number;
    selected_count: number;
    retouch_request_count: number;
    days_since_created: number | null;
  };
  /** 보정 요청서 내려받기(외부 작가 전달용) */
  retouch_request_exported: { gallery_id: number; round: number; photo_count: number };
  /** 보정 재요청 회차 보냄 */
  retouch_round_sent: { gallery_id: number; round: number; photo_count: number; actor: Actor };
  /** 보정 확인 — 두 번째 핵심 가치 도달이자 흐름의 끝 */
  retouch_confirmed: { gallery_id: number; rounds_used: number };
  /** 보정본 ZIP 내려받기(회차별) */
  results_downloaded: { gallery_id: number; round: number; photo_count: number };

  // ── 개인 결제 고객 · 우선 2 ──────────────────────────────────────
  photo_selected: { gallery_id: number; count: number };
  photo_deselected: { gallery_id: number; count: number };
  ai_recommendation_requested: { gallery_id: number };
  selection_increase_requested: { gallery_id: number; requested_count: number };
  lightbox_opened: { gallery_id: number; from: "select" | "review" };
  partner_invite_issued: { gallery_id: number };
  /** 개인 갤러리 상단 단계 칩(이슈 147) — from · to는 단계 번호(0 업로드 ~ 4 완료). result: moved 바로 이동 · modal 확인 창 · view 읽기 전용 보기 · locked 스낵바 */
  stage_chip_pressed: { gallery_id: number; from: number; to: number; result: "moved" | "modal" | "view" | "locked" };
  /** 셀렉 필터(이슈 149) — 조건이 바뀌고 잠깐 뒤 한 번. scores는 "5 4 0"(0 = 별점 없음), count는 보이는 장수 */
  select_filter_applied: { gallery_id: number; pick: "all" | "picked" | "unpicked"; scores: string; guest: boolean; ai: boolean; count: number };
  /** source filter = 공유폴더 모달의 "지금 보는 사진" · "별점으로"(이슈 149) */
  collab_session_created: { gallery_id: number; photo_count: number; source: "share_folder" | "invite_guests" | "filter" };
  guest_reactions_viewed: { gallery_id: number; session_id: number };
  /** 게스트(익명)의 입장 · 좋아요 · 댓글. 협업 토큰은 싣지 않는다 */
  guest_entered: { session_id: number | null };
  guest_photo_liked: { session_id: number | null };
  guest_comment_written: { session_id: number | null };

  // ── 체험 페이지(/demo, 이슈 144) — 체험 중에는 이것만 보낸다 ──
  /** 랜딩에서 체험으로 가는 버튼 */
  demo_cta_clicked: { from: "hero" };
  /** 체험 페이지에 들어옴 — 이 브라우저에 남은 진행 단계 */
  demo_opened: { phase: "sort" | "select" | "review" };
  /** 체험 안에서 단계가 넘어감(폴더 확정 · 요청서 내보내기) */
  demo_stage_changed: { phase: "select" | "review" };
  /** 체험 띠의 "내 사진으로 시작하기" */
  demo_signup_clicked: { phase: "sort" | "select" | "review" };
};

export type EventName = keyof EventMap;

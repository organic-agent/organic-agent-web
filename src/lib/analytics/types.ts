/**
 * 분석 어댑터 계약 — 화면은 이 인터페이스 뒤에 어떤 도구가 있는지 모른다
 * 위치: src/lib/analytics/types.ts
 *
 * 어떤 분석 도구든 호출은 다섯 가지뿐이다. 도구를 바꿀 때는 adapters/ 아래 파일 하나만 갈아 끼우고,
 * 화면 · API 모듈의 track 호출은 그대로 둔다. 설계: 이슈 #133.
 */

export type PropValue = string | number | boolean | null | undefined | readonly string[];
export type Props = Record<string, PropValue>;

/** identify 때 한 번 보내는 사용자 속성. 이벤트마다 반복해서 싣지 않는다 */
export type IdentifyProps = {
  provider: string;
  role: string;
  /** 소속 종류 목록 — studio_owner · studio_member · studio_client · personal_owner · personal_partner */
  workspace_kinds: readonly string[];
  /** 개인 갤러리에 배우자로 합류한 계정이면 true */
  partner: boolean;
  signed_up_at: string | null;
  /** 가입 ISO 주차(예: 2026-W42). 무료 플랜에서도 가입 주차별 코호트를 만들기 위한 값 */
  signup_week: string | null;
};

export interface AnalyticsAdapter {
  /** 도구 초기화. 하이드레이션 전에 1회 */
  init(): void;
  /** 화면 이동. url은 이미 safeUrl로 가려진 경로 + 쿼리 */
  page(url: string): void;
  /** 익명 기록을 사용자 ID에 합친다 */
  identify(userId: string, props: IdentifyProps): void;
  /** 로그아웃 — 사용자 연결을 끊고 새 익명 ID로 */
  reset(): void;
  /** 행동 기록. 이름 · 속성은 events.ts의 사전을 따른다 */
  track(name: string, props: Props): void;
}

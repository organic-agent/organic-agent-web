/**
 * 작가 — 갤러리 온보딩 설정
 * 위치: src/app/(photographer)/onboarding/gallery/_lib/galleryOnboarding.ts
 *
 * 갤러리 생성 온보딩에서 사용하는 단계 정의를 모은다.
 * 페이지와 컴포넌트가 같은 단계 타입을 공유하도록 한다.
 *
 * 주요 책임:
 * - 온보딩 단계 타입 정의
 * - 단계별 제목/설명/선택 여부 정의
 */

export type StepKey = "name" | "dueDate" | "target" | "concept" | "memo";

export const STEPS: {
  key: StepKey;
  title: string;
  desc: string;
  optional?: boolean;
}[] = [
  {
    key: "name",
    title: "갤러리 이름을 정해주세요",
    desc: "신혼부부와 작가가 함께 구분할 이름이에요. 보통 두 사람의 이름과 촬영 종류를 함께 적습니다.",
  },
  {
    key: "dueDate",
    title: "완료 예정일을 정해주세요",
    desc: "부부가 사진을 고를 수 있는 마감일이에요. 목록에서는 이 날짜를 기준으로 지연 여부를 확인합니다.",
  },
  {
    key: "target",
    title: "목표 선택 장수를 정해주세요",
    desc: "부부가 몇 장 정도 고르면 되는지 알려주는 기준이에요. 정확한 제한이 아니라 안내값에 가깝습니다.",
  },
  {
    key: "concept",
    title: "컨셉 개수를 입력해볼까요",
    desc: "AI가 장면을 나눌 때 참고할 값이에요. 아직 정하지 않았다면 비워둬도 괜찮습니다.",
    optional: true,
  },
  {
    key: "memo",
    title: "특이사항을 남겨주세요",
    desc: "예식이 얼마 남지 않았거나, 특정 요청이 있다면 메모로 남겨둘 수 있어요. 없어도 괜찮습니다.",
    optional: true,
  },
];

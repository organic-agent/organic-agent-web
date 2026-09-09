"use client";

/**
 * 역할 선택 — 회원가입 뒤, 초대 없이 소속이 하나도 없는 사용자가 도착하는 곳
 * 위치: src/app/(auth)/onboarding/role/page.tsx
 *
 * 타일 두 개(스튜디오 / 내 갤러리)를 라디오처럼 하나 고르고 "계속"을 누른다.
 * 고르기 전엔 버튼이 비활성이고, 고르면 버튼 문구가 선택한 쪽으로 바뀐다.
 * 초대 링크로 와야 하는 사람은 여기서 고르지 말라고 힌트로 알린다 — 링크는
 * 사용자가 받은 것을 직접 열어야 하므로 우리가 대신 열어 줄 곳이 없다.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EntryTopbar } from "@/components/app/EntryTopbar";
import { HeartIcon, PhotoIcon, ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/authStore";

type Role = "studio" | "personal";

const ROLES: {
  key: Role;
  title: string;
  desc: string;
  cta: string;
  href: string;
  Icon: typeof PhotoIcon;
}[] = [
  {
    key: "studio",
    title: "스튜디오를 열어요",
    desc: "갤러리를 만들고 클라이언트를 초대해 관리합니다",
    cta: "스튜디오 만들기",
    href: "/onboarding/studio",
    Icon: PhotoIcon,
  },
  {
    key: "personal",
    title: "내 갤러리를 만들어요",
    desc: "받은 원본을 올려 파트너와 함께 고릅니다",
    cta: "내 갤러리 만들기",
    href: "/onboarding/personal",
    Icon: HeartIcon,
  },
];

export default function RoleSelectPage() {
  const router = useRouter();
  const auth = useAuth();
  const [picked, setPicked] = useState<Role | null>(null);

  const chosen = ROLES.find((r) => r.key === picked) ?? null;
  const initial = auth.user?.nickname.trim().slice(0, 1) || "?";

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar initial={initial} />
      <div className="grid flex-1 place-items-center px-6 py-14">
        <div className="flex w-full max-w-190 flex-col items-center gap-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="type-label-eyebrow text-brand-secondary-default">Get started</p>
            <h1 className="type-maintext-s text-balance text-contents-light-bgd-default">
              어떻게 시작할까요?
            </h1>
            <p className="type-content-l text-contents-light-bgd-sub">
              하나를 고르고 계속하세요. 나중에 바꿀 수 있어요.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="시작 방식"
            className="grid w-full grid-cols-2 gap-4 text-left max-[720px]:grid-cols-1"
          >
            {ROLES.map(({ key, title, desc, Icon }) => {
              const checked = picked === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setPicked(key)}
                  className="group relative flex cursor-pointer flex-col gap-2.5 rounded-(--radius-16) border border-divider-default bg-background-default-main p-6 text-left transition-[border-color,box-shadow] duration-fast ease-out hover:border-brand-secondary-light hover:shadow-(--shadow-hover) aria-checked:border-brand-primary-default aria-checked:shadow-[inset_0_0_0_1px_var(--brand-primary-default)]"
                >
                  {/* 라디오 표시 — 고르면 채워진다 */}
                  <span
                    aria-hidden
                    className="absolute top-4 right-4 grid size-5.5 place-items-center rounded-full border-[1.5px] border-border-default transition-colors duration-fast group-aria-checked:border-brand-primary-default group-aria-checked:bg-brand-primary-default"
                  >
                    <span className="size-2 rounded-full bg-background-default-main opacity-0 group-aria-checked:opacity-100" />
                  </span>
                  <span className="grid size-10 place-items-center rounded-(--radius-12) bg-brand-secondary-background text-brand-secondary-default">
                    <Icon />
                  </span>
                  <span className="type-title-m text-contents-light-bgd-default">{title}</span>
                  <span className="type-content-s text-contents-light-bgd-sub">{desc}</span>
                </button>
              );
            })}
          </div>

          <Button
            size="lg"
            icon={<ArrowRightIcon />}
            disabled={chosen === null}
            onClick={() => chosen && router.push(chosen.href)}
          >
            {chosen ? chosen.cta : "계속"}
          </Button>

          <p className="type-content-s text-contents-light-bgd-weakness">
            초대 링크를 받았다면 여기서 고르지 말고 받은 링크를 그대로 열어 주세요.
            <br />
            역할은 나중에 워크스페이스로 더 추가할 수 있어요.
          </p>
        </div>
      </div>
    </main>
  );
}

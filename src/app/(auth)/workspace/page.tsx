"use client";

/**
 * 워크스페이스 목록 — 소속이 둘 이상일 때 로그인 직후, 프로필 메뉴의 "모두 보기", nav 칩
 * 위치: src/app/(auth)/workspace/page.tsx
 *
 * 내 소속(스튜디오·갤러리)을 최근 활동순 카드로 보여주고 하나를 고르면 그 공간으로 간다(W1).
 * 소속이 없으면 역할 선택으로. 데이터는 로그인 때 받은 내 정보의 소속 목록을 그대로 쓴다.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EntryTopbar } from "@/components/app/EntryTopbar";
import { ArrowRightIcon, HeartIcon, PhotoIcon, PlusIcon } from "@/components/icons";
import type { UserWorkspace } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/authStore";
import { sortByRecentActivity, workspacePath } from "@/lib/auth/loginFlow";

const ROLE_LABEL: Record<UserWorkspace["role"], string> = { OWNER: "소유자", MEMBER: "멤버" };
const relativeFormat = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

/** "오늘", "3일 전", "2개월 전" — 최근 활동 시각을 사람 말로 */
function relativeLabel(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "오늘";
  if (days < 30) return relativeFormat.format(-days, "day");
  if (days < 365) return relativeFormat.format(-Math.round(days / 30), "month");
  return relativeFormat.format(-Math.round(days / 365), "year");
}

export default function WorkspaceListPage() {
  const router = useRouter();
  const auth = useAuth();
  const spaces = sortByRecentActivity(auth.user?.workspaces ?? []);

  // 가드를 지났는데 소속이 없으면 여기 있을 이유가 없다 — 역할 선택으로
  useEffect(() => {
    if (auth.status === "authenticated" && spaces.length === 0) {
      router.replace("/onboarding/role");
    }
  }, [auth.status, spaces.length, router]);

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar />
      <div className="grid flex-1 place-items-start justify-items-center px-6 py-10">
        <div className="w-full max-w-190">
          <p className="type-label-eyebrow text-brand-secondary-default">Workspaces</p>
          <h1 className="mt-2 mb-1.5 type-title-xl text-balance text-contents-light-bgd-default">
            어디로 갈까요?
          </h1>
          <p className="mb-6 type-content-m text-contents-light-bgd-sub">
            소속된 스튜디오와 갤러리예요. 최근에 활동한 순서로 보여요.
          </p>

          <ul className="grid grid-cols-2 gap-3.5 max-[720px]:grid-cols-1" aria-label="내 워크스페이스">
            {spaces.map((space) => {
              const Icon = space.kind === "STUDIO" ? PhotoIcon : HeartIcon;
              const when = relativeLabel(space.lastActivityAt);
              return (
                <li key={space.id}>
                  <button
                    type="button"
                    onClick={() => router.push(workspacePath(space))}
                    className="flex w-full cursor-pointer items-start gap-3.5 rounded-(--radius-16) border border-divider-default bg-background-default-main p-4.5 text-left transition-[border-color,translate,box-shadow] duration-base ease-out hover:-translate-y-0.5 hover:border-brand-secondary-light hover:shadow-(--shadow-hover)"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-(--radius-12) bg-brand-secondary-background text-brand-secondary-default">
                      <Icon size={22} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate type-label-semibold-m text-contents-light-bgd-default">
                        {space.name}
                      </span>
                      {when && (
                        <span className="mt-0.5 type-content-xs text-contents-light-bgd-weakness">
                          최근 활동 {when}
                        </span>
                      )}
                      <span className="mt-2 flex gap-1.5">
                        <span className="rounded-(--pill) bg-brand-secondary-background px-2 py-0.5 type-label-medium-xs text-brand-secondary-dark">
                          {space.kind === "STUDIO" ? "스튜디오" : "갤러리"}
                        </span>
                        <span className="rounded-(--pill) bg-surface-default-light px-2 py-0.5 type-label-medium-xs text-contents-light-bgd-weakness">
                          {ROLE_LABEL[space.role]}
                        </span>
                      </span>
                    </span>
                    <ArrowRightIcon
                      size={20}
                      className="self-center text-contents-light-bgd-weakness"
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => router.push("/onboarding/role")}
            className="mt-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-(--pill) border border-dashed border-border-default px-5 type-content-s text-contents-light-bgd-sub transition-colors duration-fast hover:border-brand-secondary-light hover:bg-brand-secondary-background hover:text-brand-secondary-dark"
          >
            <PlusIcon size={18} />새 공간 만들기
          </button>
        </div>
      </div>
    </main>
  );
}

"use client";

/**
 * 설정 페이지 본체 — 좌측 내비(계정 · 스튜디오별 · 개인 갤러리) + 상단 탭 + 내용 (보드 N1)
 * 위치: src/app/(auth)/settings/_components/SettingsPage.tsx
 *
 * 어느 화면인지는 주소 쿼리가 정한다: ?studio={workspaceId}&tab=… (없으면 계정 › 프로필).
 * 스튜디오 목록은 GET /studios로 받아 역할(OWNER/MEMBER)까지 안다. 개인 갤러리는 아직 잠김 —
 * 개인 결제 클라이언트(C4) 때 연다.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EntryTopbar } from "@/components/app/EntryTopbar";
import { BackIcon, PhotoIcon } from "@/components/icons";
import type { User } from "@/lib/api/auth";
import { listMyStudios, type StudioResponse } from "@/lib/api/studios";
import { useAuth } from "@/lib/auth/authStore";
import { sortByRecentActivity, workspacePath } from "@/lib/auth/loginFlow";
import {
  AccountDeleteTab,
  AccountDisplayTab,
  AccountNotificationsTab,
  AccountProfileTab,
} from "./AccountTabs";
import { NavGroup, NavInitial, NavItem, SettingsTabs } from "./SettingsShell";
import {
  StudioDangerTab,
  StudioInfoTab,
  StudioMembersTab,
  StudioTicketsTab,
} from "./StudioTabs";

type AccountTab = "profile" | "display" | "notifications" | "delete";
type StudioTab = "info" | "members" | "tickets" | "danger";

const ACCOUNT_TABS = [
  ["profile", "프로필"],
  ["display", "화면"],
  ["notifications", "알림"],
  ["delete", "계정 삭제"],
] as const satisfies ReadonlyArray<readonly [AccountTab, string]>;

const STUDIO_TAB_KEYS: StudioTab[] = ["info", "members", "tickets", "danger"];
const ACCOUNT_TAB_KEYS: AccountTab[] = ["profile", "display", "notifications", "delete"];

const ROLE_LABEL = { OWNER: "소유자", MEMBER: "멤버" } as const;

/** 들어온 곳(from)의 이름 — 랜딩 · 역할 선택 · 워크스페이스 · 스튜디오 홈 · 갤러리 */
function backLabelFor(path: string): string {
  if (path === "/") return "처음으로";
  if (path.startsWith("/onboarding/role")) return "역할 선택으로";
  if (path.startsWith("/onboarding")) return "온보딩으로";
  if (path.startsWith("/workspace")) return "워크스페이스로";
  if (path.startsWith("/studio/gallery/") || path.startsWith("/gallery")) return "갤러리로";
  if (path.startsWith("/studio")) return "스튜디오 홈으로";
  if (path.startsWith("/invite")) return "초대로";
  return "돌아가기";
}

/** from 쿼리는 우리 사이트 안 경로만 믿는다 — 설정 자신으로 되돌아가는 값도 버린다 */
function safeFrom(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes(":")) return null;
  if (raw.startsWith("/settings")) return null;
  return raw;
}

/**
 * 설정에서 돌아갈 곳 — 프로필 메뉴에서 들어왔으면 그 화면(from)으로. 주소로 바로 왔으면
 * 보고 있던 스튜디오 홈, 그것도 없으면 소속 규칙대로(하나면 그 공간, 둘 이상이면 워크스페이스 목록, 없으면 랜딩).
 */
function backTarget(
  user: User,
  studio: StudioResponse | null,
  from: string | null,
): { href: string; label: string } {
  if (from) return { href: from, label: backLabelFor(from) };
  if (studio) return { href: `/studio/${studio.galleryUrl}`, label: `${studio.name} 홈으로` };
  const spaces = sortByRecentActivity(user.workspaces ?? []);
  if (spaces.length === 0) return { href: "/", label: "처음으로" };
  if (spaces.length > 1) return { href: "/workspace", label: "워크스페이스 목록으로" };
  const space = spaces[0];
  return {
    href: workspacePath(space),
    label: `${space.name}${space.kind === "STUDIO" ? " 홈으로" : "로"}`,
  };
}

export function SettingsPage() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const studioParam = params.get("studio");
  const tabParam = params.get("tab");
  const from = safeFrom(params.get("from"));
  const [studios, setStudios] = useState<StudioResponse[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listMyStudios();
        if (!cancelled) setStudios(list);
      } catch {
        if (!cancelled) setStudios([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (auth.status !== "authenticated") return null;
  const user = auth.user;

  const studio =
    studioParam && studios
      ? (studios.find((s) => String(s.workspaceId) === studioParam) ?? null)
      : null;
  const waitingStudio = studioParam !== null && studios === null;
  const personalGalleries = user.workspaces.filter((w) => w.kind === "GALLERY");

  function go(next: { studio?: number; tab?: string }) {
    const q = new URLSearchParams();
    if (next.studio !== undefined) q.set("studio", String(next.studio));
    if (next.tab) q.set("tab", next.tab);
    if (from) q.set("from", from); // 화면을 옮겨 다녀도 돌아갈 곳은 그대로
    const qs = q.toString();
    router.replace(`/settings${qs ? `?${qs}` : ""}`);
  }

  const back = backTarget(user, studio, from);

  function studioUpdated(updated: StudioResponse) {
    setStudios((prev) =>
      prev ? prev.map((s) => (s.workspaceId === updated.workspaceId ? updated : s)) : prev,
    );
  }

  let content: React.ReactNode;
  if (studio) {
    const owner = studio.role === "OWNER";
    const tab: StudioTab = STUDIO_TAB_KEYS.includes(tabParam as StudioTab)
      ? (tabParam as StudioTab)
      : "info";
    const tabs = [
      ["info", "정보"],
      ["members", "멤버"],
      ["tickets", "이용권"],
      ["danger", owner ? "스튜디오 삭제" : "스튜디오 나가기"],
    ] as const satisfies ReadonlyArray<readonly [StudioTab, string]>;
    content = (
      <>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="truncate type-title-m text-contents-light-bgd-default">{studio.name}</h2>
          <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness">
            {ROLE_LABEL[studio.role ?? "MEMBER"]}
          </span>
        </div>
        <SettingsTabs
          tabs={tabs}
          current={tab}
          dangerKey="danger"
          onChange={(next) => go({ studio: studio.workspaceId, tab: next })}
        />
        {tab === "info" && (
          <StudioInfoTab key={studio.workspaceId} studio={studio} onUpdated={studioUpdated} />
        )}
        {tab === "members" && <StudioMembersTab key={studio.workspaceId} studio={studio} />}
        {tab === "tickets" && <StudioTicketsTab key={studio.workspaceId} studio={studio} />}
        {tab === "danger" && <StudioDangerTab key={studio.workspaceId} studio={studio} />}
      </>
    );
  } else if (waitingStudio) {
    content = <div className="h-40 animate-pulse rounded-(--radius-12) bg-surface-default-light" />;
  } else {
    const tab: AccountTab = ACCOUNT_TAB_KEYS.includes(tabParam as AccountTab)
      ? (tabParam as AccountTab)
      : "profile";
    content = (
      <>
        <h2 className="mb-1 type-title-m text-contents-light-bgd-default">계정</h2>
        <SettingsTabs
          tabs={ACCOUNT_TABS}
          current={tab}
          dangerKey="delete"
          onChange={(next) => go({ tab: next })}
        />
        {tab === "profile" && <AccountProfileTab key={user.nickname} user={user} />}
        {tab === "display" && <AccountDisplayTab />}
        {tab === "notifications" && <AccountNotificationsTab />}
        {tab === "delete" && <AccountDeleteTab user={user} />}
      </>
    );
  }

  return (
    <main className="min-h-dvh bg-background-default-main">
      <EntryTopbar />
      <div className="mx-auto w-full max-w-wrap px-6 py-8">
        <Link
          href={back.href}
          className="mb-4 inline-flex items-center gap-1 type-label-medium-m text-contents-light-bgd-sub transition-colors duration-fast hover:text-contents-light-bgd-default"
        >
          <BackIcon size={16} />
          {back.label}
        </Link>
        <h1 className="mb-6 type-title-xl text-contents-light-bgd-default">설정</h1>
        <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-11">
          <nav aria-label="설정 항목" className="flex flex-col gap-7 md:sticky md:top-6 md:self-start">
            <NavGroup label="계정">
              <NavItem
                icon={<NavInitial text={user.nickname} />}
                label={user.nickname}
                selected={!studio && !waitingStudio}
                onClick={() => go({})}
              />
            </NavGroup>
            <NavGroup label="스튜디오">
              {studios === null ? (
                <span className="mx-3 my-2 h-5 animate-pulse rounded-(--radius-4) bg-surface-default-light" />
              ) : studios.length === 0 ? (
                <p className="px-3 py-2 type-content-xs text-contents-light-bgd-weakness">
                  소속된 스튜디오가 없어요
                </p>
              ) : (
                studios.map((s) => (
                  <NavItem
                    key={s.workspaceId}
                    icon={<NavInitial text={s.name} />}
                    label={s.name}
                    meta={ROLE_LABEL[s.role ?? "MEMBER"]}
                    selected={studio?.workspaceId === s.workspaceId}
                    onClick={() => go({ studio: s.workspaceId })}
                  />
                ))
              )}
            </NavGroup>
            <NavGroup label="개인 갤러리">
              {personalGalleries.length === 0 ? (
                <NavItem icon={<PhotoIcon size={18} />} label="개인 갤러리" meta="잠김" locked />
              ) : (
                personalGalleries.map((w) => (
                  <NavItem key={w.id} icon={<PhotoIcon size={18} />} label={w.name} meta="잠김" locked />
                ))
              )}
            </NavGroup>
          </nav>
          <section className="min-w-0 max-w-[620px]">{content}</section>
        </div>
      </div>
    </main>
  );
}

"use client";

/**
 * 설정 페이지 본체 — 좌측 내비(계정 · 스튜디오별 · 개인 갤러리) + 상단 탭 + 내용 (보드 N1)
 * 위치: src/app/(auth)/settings/_components/SettingsPage.tsx
 *
 * 어느 화면인지는 주소 쿼리가 정한다: ?studio={workspaceId}&tab=… (없으면 계정 › 프로필).
 * 스튜디오 목록은 GET /studios로 받아 역할(OWNER/MEMBER)까지 안다. 개인 갤러리는 ?gallery={galleryId}&tab=… —
 * 소유자: 정보 · 플랜 · 파트너 · 갤러리 삭제 / 파트너: 정보(읽기) · 플랜 · 갤러리 나가기 (이슈 75, 2026-09-23).
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
import { PersonalDangerTab, PersonalInfoTab, PersonalLeaveTab, PersonalPartnerTab, PersonalPlanTab, usePersonalGallery } from "./PersonalGalleryTabs";
import { NavGroup, NavInitial, NavItem, SettingsTabs } from "./SettingsShell";
import {
  StudioDangerTab,
  StudioInfoTab,
  StudioMembersTab,
  StudioTicketsTab,
} from "./StudioTabs";

type AccountTab = "profile" | "display" | "notifications" | "delete";
type StudioTab = "info" | "members" | "tickets" | "danger";
type GalleryTab = "info" | "plan" | "partner" | "danger";
const GALLERY_TAB_KEYS: GalleryTab[] = ["info", "plan", "partner", "danger"];

const ACCOUNT_TABS = [
  ["profile", "프로필"],
  ["display", "화면"],
  ["notifications", "알림"],
  ["delete", "회원 탈퇴"],
] as const satisfies ReadonlyArray<readonly [AccountTab, string]>;

const STUDIO_TAB_KEYS: StudioTab[] = ["info", "members", "tickets", "danger"];
const ACCOUNT_TAB_KEYS: AccountTab[] = ["profile", "display", "notifications", "delete"];

const ROLE_LABEL = { OWNER: "소유자", MEMBER: "멤버" } as const;

/** from 쿼리는 우리 사이트 안 경로만 믿는다 — 설정 자신으로 되돌아가는 값도 버린다 */
function safeFrom(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes(":")) return null;
  if (raw.startsWith("/settings")) return null;
  return raw;
}

/**
 * 설정에서 돌아갈 곳 — 프로필 메뉴에서 들어왔으면 그 화면(from)으로. 주소로 바로 왔으면
 * 보고 있던 스튜디오 홈, 그것도 없으면 소속 규칙대로(하나면 그 공간, 둘 이상이면 워크스페이스 목록, 없으면 랜딩).
 * 링크 이름은 어디로 가든 "돌아가기" 하나다(문구 점검 A28, 2026-10-06).
 */
function backTarget(user: User, studio: StudioResponse | null, from: string | null): { href: string; label: string } {
  const label = "돌아가기";
  if (from) return { href: from, label };
  if (studio) return { href: `/studio/${studio.galleryUrl}`, label };
  const spaces = sortByRecentActivity(user.workspaces ?? []);
  if (spaces.length === 0) return { href: "/", label };
  if (spaces.length > 1) return { href: "/workspace", label };
  return { href: workspacePath(spaces[0]), label };
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
  const personalGalleries = user.workspaces.filter((w) => w.kind === "GALLERY" && w.workspaceType === "PERSONAL");
  const galleryParam = params.get("gallery");
  const personalGallery = galleryParam ? (personalGalleries.find((w) => String(w.galleryId) === galleryParam) ?? null) : null;

  function go(next: { studio?: number; gallery?: number; tab?: string }) {
    const q = new URLSearchParams();
    if (next.studio !== undefined) q.set("studio", String(next.studio));
    if (next.gallery !== undefined) q.set("gallery", String(next.gallery));
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
  if (personalGallery && personalGallery.galleryId !== null) {
    const tab: GalleryTab = GALLERY_TAB_KEYS.includes(tabParam as GalleryTab) ? (tabParam as GalleryTab) : "info";
    content = (
      <PersonalGalleryContent
        key={personalGallery.galleryId}
        galleryId={personalGallery.galleryId}
        name={personalGallery.name}
        owner={personalGallery.role === "OWNER"}
        tab={tab}
        onTab={(next) => go({ gallery: personalGallery.galleryId ?? undefined, tab: next })}
      />
    );
  } else if (studio) {
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
                selected={!studio && !waitingStudio && !personalGallery}
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
                <p className="px-3 py-2 type-content-xs text-contents-light-bgd-weakness">개인 갤러리가 없어요</p>
              ) : (
                personalGalleries.map((w) =>
                  w.galleryId !== null ? (
                    <NavItem
                      key={w.id}
                      icon={<PhotoIcon size={18} />}
                      label={w.name}
                      meta={w.role === "OWNER" ? "소유자" : "파트너"}
                      selected={personalGallery?.id === w.id}
                      onClick={() => go({ gallery: w.galleryId ?? undefined })}
                    />
                  ) : (
                    <NavItem key={w.id} icon={<PhotoIcon size={18} />} label={w.name} meta="잠김" locked />
                  ),
                )
              )}
            </NavGroup>
          </nav>
          <section className="min-w-0 max-w-[620px]">{content}</section>
        </div>
      </div>
    </main>
  );
}

/** 설정 › 개인 갤러리 본문 — 갤러리를 읽어 정보 · 파트너 · 삭제 탭에 준다 */
function PersonalGalleryContent({ galleryId, name, owner, tab, onTab }: { galleryId: number; name: string; owner: boolean; tab: GalleryTab; onTab: (tab: GalleryTab) => void }) {
  const { gallery, failed, setGallery, retry } = usePersonalGallery(galleryId);
  const tabs = (
    owner
      ? [
          ["info", "정보"],
          ["plan", "플랜"],
          ["partner", "파트너"],
          ["danger", "갤러리 삭제"],
        ]
      : [
          ["info", "정보"],
          ["plan", "플랜"],
          ["danger", "갤러리 나가기"],
        ]
  ) satisfies ReadonlyArray<readonly [GalleryTab, string]>;
  const shownTab: GalleryTab = tab === "partner" && !owner ? "info" : tab;
  return (
    <>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="truncate type-title-m text-contents-light-bgd-default">{gallery?.title ?? name}</h2>
        <span className="shrink-0 type-content-xs text-contents-light-bgd-weakness">{owner ? "소유자" : "파트너"}</span>
      </div>
      <SettingsTabs tabs={tabs} current={shownTab} dangerKey="danger" onChange={onTab} />
      {failed ? (
        <p role="alert" className="flex items-center gap-3 type-content-s text-function-error-default">
          갤러리를 불러오지 못했어요
          <button type="button" onClick={retry} className="cursor-pointer type-content-s font-semibold text-contents-light-bgd-default underline underline-offset-2">
            다시 시도
          </button>
        </p>
      ) : !gallery ? (
        <div className="h-40 animate-pulse rounded-(--radius-12) bg-surface-default-light" />
      ) : shownTab === "info" ? (
        <PersonalInfoTab key={gallery.id} gallery={gallery} canEdit={owner} onUpdated={setGallery} />
      ) : shownTab === "plan" ? (
        <PersonalPlanTab gallery={gallery} />
      ) : shownTab === "partner" ? (
        <PersonalPartnerTab galleryId={gallery.id} />
      ) : owner ? (
        <PersonalDangerTab gallery={gallery} />
      ) : (
        <PersonalLeaveTab gallery={gallery} />
      )}
    </>
  );
}

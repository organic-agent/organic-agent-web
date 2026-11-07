"use client";

/**
 * 설정 › 계정 — 프로필 · 화면(테마 · 함께 고르기 색) · 알림 · 회원 탈퇴
 * 위치: src/app/(auth)/settings/_components/AccountTabs.tsx
 */

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { assignMembers, MEMBER_COLORS, MEMBER_INK, memberColorVar } from "@/app/(client)/gallery/[galleryId]/_shell/members";
import { buildIdentifyProps, track } from "@/lib/analytics";
import { DarkModeIcon, InfoIcon, LightModeIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { deleteMyAccount, updateMyColor, updateNickname, type User, type UserColorKey } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { type GalleryMemberResponse, listGalleryMembers } from "@/lib/api/galleries";
import { setAuthenticated } from "@/lib/auth/authStore";
import { logout } from "@/lib/auth/logout";
import { useTheme, type Theme } from "@/lib/theme";
import { DangerConfirmModal } from "./DangerConfirmModal";
import {
  DangerButton,
  DangerCard,
  FieldLabel,
  ReadOnlyBox,
  Section,
} from "./SettingsShell";

const PROVIDER_LABEL: Record<User["provider"], string> = {
  kakao: "카카오",
  google: "구글",
  naver: "네이버",
};

function joinedLabel(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} 가입`;
}

export function AccountProfileTab({ user }: { user: User }) {
  const id = useId();
  const [nickname, setNickname] = useState(user.nickname);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef(0);
  const dirty = nickname.trim() !== user.nickname;
  const valid = nickname.trim().length > 0;
  const joined = joinedLabel(user.createdAt);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function save() {
    if (!dirty || !valid || saving) return;
    setSaving(true);
    setBanner(null);
    try {
      const updated = await updateNickname(nickname.trim());
      setAuthenticated({ ...user, ...updated, workspaces: updated.workspaces ?? user.workspaces });
      setSaved(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setBanner(
        err instanceof ApiError ? err.message : "저장하지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="프로필">
      <div className="mb-6 flex items-center gap-3.5">
        <span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-default-light type-title-m text-contents-light-bgd-default"
        >
          {user.nickname.trim().slice(0, 1) || "?"}
        </span>
        <div>
          <p className="type-label-semibold-l text-contents-light-bgd-default">{user.nickname}</p>
          {joined && <p className="type-content-xs text-contents-light-bgd-weakness">{joined}</p>}
        </div>
      </div>
      <div className="mb-5">
        <FieldLabel htmlFor={`${id}-nick`}>닉네임</FieldLabel>
        <TextField
          id={`${id}-nick`}
          value={nickname}
          onChange={setNickname}
          error={!valid}
          autoComplete="nickname"
          className="h-12 px-4"
        />
        {!valid && (
          <p className="mt-1.5 type-content-xs text-function-error-default">닉네임을 입력해 주세요</p>
        )}
      </div>
      <div className="mb-5">
        <FieldLabel>이메일</FieldLabel>
        <ReadOnlyBox>{user.email ?? "이메일 없음"}</ReadOnlyBox>
      </div>
      <div className="mb-6">
        <FieldLabel>로그인 방식</FieldLabel>
        <span className="inline-flex h-8 items-center rounded-(--pill) bg-surface-default-light px-3 type-content-xs text-contents-light-bgd-default">
          {PROVIDER_LABEL[user.provider]}로 로그인
        </span>
      </div>
      {banner && (
        <p role="alert" className="mb-4 type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="mr-auto type-content-xs text-brand-accent-text">저장했어요</span>
        )}
        <Button kind="ghost" disabled={!dirty || saving} onClick={() => setNickname(user.nickname)}>
          되돌리기
        </Button>
        <Button disabled={!dirty || !valid || saving} onClick={() => void save()}>
          {saving ? "저장하는 중…" : "저장"}
        </Button>
      </div>
    </Section>
  );
}

const THEMES: ReadonlyArray<{ value: Theme; label: string; desc: string }> = [
  { value: "light", label: "라이트", desc: "밝은 배경" },
  { value: "dark", label: "다크", desc: "어두운 배경" },
];

export function AccountDisplayTab({ user }: { user: User }) {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <Section title="화면">
        <div role="radiogroup" aria-label="테마" className="grid grid-cols-2 gap-2.5">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={theme === t.value}
              onClick={() => setTheme(t.value)}
              className="flex cursor-pointer flex-col gap-2 rounded-(--radius-12) border border-divider-default bg-background-default-main p-3.5 text-left transition-[border-color,box-shadow] duration-fast hover:border-brand-secondary-light aria-checked:border-brand-primary-default aria-checked:shadow-[inset_0_0_0_1px_var(--brand-primary-default)]"
            >
              <span
                className={`grid h-11 place-items-center rounded-(--radius-8) border border-divider-default ${
                  t.value === "dark" ? "bg-[#202020] text-[#FFFFFF]" : "bg-white text-[#323232]"
                }`}
              >
                {t.value === "dark" ? <DarkModeIcon size={20} /> : <LightModeIcon size={20} />}
              </span>
              <span className="type-label-semibold-s text-contents-light-bgd-default">{t.label}</span>
              <span className="-mt-1.5 type-content-xs text-contents-light-bgd-weakness">{t.desc}</span>
            </button>
          ))}
        </div>
      </Section>
      <MemberColorSection user={user} />
    </>
  );
}

/**
 * 함께 고르기 색(이슈 148 2차) — 개인 갤러리가 있는 사람에게만 보인다. 일곱 색 중 하나를 누르면 바로 저장하고(PUT /users/me/color),
 * 함께 고르는 사람이 쓰는 색은 막는다. 안 골랐으면 들어온 순서의 기본 색이 골라진 것으로 보인다(members.assignMembers와 같은 규칙).
 * 상대 · 미리보기는 첫 개인 갤러리의 멤버 목록으로 그린다(개인 갤러리는 보통 하나).
 */
function MemberColorSection({ user }: { user: User }) {
  const gallery = user.workspaces.find((w) => w.kind === "GALLERY" && w.workspaceType === "PERSONAL" && w.galleryId !== null) ?? null;
  const galleryId = gallery?.galleryId ?? null;
  const [members, setMembers] = useState<GalleryMemberResponse[] | null>(null);
  const [saving, setSaving] = useState<UserColorKey | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (galleryId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listGalleryMembers(galleryId);
        if (!cancelled) setMembers(list);
      } catch {
        if (!cancelled) setMembers([]); // 못 읽으면 상대 없이 — 색 고르기는 된다
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [galleryId]);

  if (galleryId === null) return null;

  // 멤버 목록에는 저장 전 색이 있을 수 있어 내 색은 user.color를 앞세운다
  const people = assignMembers((members ?? []).map((m) => (m.userId === user.id ? { ...m, color: user.color } : m)), user.id);
  const me = people.find((p) => p.me) ?? null;
  const partner = people.find((p) => !p.me) ?? null;
  const myKey: UserColorKey | null = saving ?? user.color ?? me?.colorKey ?? null;
  const myInitial = me?.initial ?? ([...user.nickname.trim()][0] ?? "?").toUpperCase();

  async function pick(key: UserColorKey) {
    if (saving !== null || key === myKey) return;
    setSaving(key);
    setBanner(null);
    try {
      const updated = await updateMyColor(key);
      setAuthenticated({ ...user, ...updated, workspaces: updated.workspaces ?? user.workspaces });
      setMembers((prev) => prev?.map((m) => (m.userId === user.id ? { ...m, color: key } : m)) ?? prev);
    } catch (err) {
      setBanner(err instanceof ApiError ? err.message : "저장하지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Section title="함께 고르기 색">
      <div className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-4">
        <span className="type-label-medium-m text-contents-light-bgd-default">내 색</span>
        <div role="radiogroup" aria-label="내 색" className="flex flex-wrap items-center gap-2.5">
          {MEMBER_COLORS.map((c) => {
            const selected = c.key === myKey;
            const taken = !selected && partner !== null && partner.colorKey === c.key;
            return (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={taken || undefined}
                aria-label={taken ? `${c.name} · ${partner.nickname} 색` : c.name}
                title={taken ? `${partner.nickname} 색` : c.name}
                onClick={() => {
                  if (!taken) void pick(c.key);
                }}
                style={{ background: memberColorVar(c.key), color: MEMBER_INK }}
                className={`grid size-9 place-items-center rounded-full transition-[transform,box-shadow,opacity] duration-fast ${
                  taken ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:scale-105"
                } ${selected ? "shadow-[0_0_0_2px_var(--background-default-main),0_0_0_4px_var(--contents-light-bgd-default)]" : ""}`}
              >
                {selected && <CheckGlyph className="size-4" />}
                {taken && <span className="type-label-semibold-xs font-bold">{partner.initial}</span>}
              </button>
            );
          })}
        </div>
        {partner && (
          <>
            <span className="type-label-medium-m text-contents-light-bgd-default">함께 고르는 사람</span>
            <span className="inline-flex items-center gap-2 type-content-s text-contents-light-bgd-default">
              <i aria-hidden className="size-3 rounded-full" style={{ background: partner.color }} />
              {partner.nickname} · {MEMBER_COLORS.find((c) => c.key === partner.colorKey)?.name}
            </span>
          </>
        )}
        <span className="type-label-medium-m text-contents-light-bgd-default">미리보기</span>
        <div className="flex items-center gap-2.5">
          {myKey && <PreviewTile color={memberColorVar(myKey)} initial={myInitial} />}
          {partner && <PreviewTile color={partner.color} initial={partner.initial} />}
        </div>
      </div>
      {banner && (
        <p role="alert" className="mt-4 type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
    </Section>
  );
}

/** 그리드 타일 축소판 — 왼쪽 위 체크 칸(담은 사람 색) · 오른쪽 위 이니셜 칩(매긴 사람 색), 셀렉 화면 PhotoGrid와 같은 모양 */
function PreviewTile({ color, initial }: { color: string; initial: string }) {
  return (
    <span aria-hidden className="relative block h-14 w-18 rounded-(--radius-8) bg-surface-default-light">
      <span style={{ background: color, color: MEMBER_INK }} className="absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-(--radius-4)">
        <CheckGlyph className="size-3.5" />
      </span>
      <span
        style={{ background: color, color: MEMBER_INK, boxShadow: "var(--shadow-pin)" }}
        className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full type-label-semibold-xs font-bold"
      >
        {initial}
      </span>
    </span>
  );
}

function CheckGlyph({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5 6.5 11.5 12.5 5" />
    </svg>
  );
}

/**
 * 알림 탭 — 이메일 · 브라우저 알림은 서버에 발송 기능이 없다(알림은 DB에만 쌓인다). 켜진 스위치가 눌리기만 하고
 * 아무것도 오지 않던 것을, 스위치를 두지 않고 안내 한 줄로 바꿨다(QA 2026-09-29 · 이슈 84, 시안 F — 수민 문구).
 * 지금 동작하는 알림은 탑바의 알림 아이콘(NotificationBell)뿐이다(설정 · 워크스페이스 화면의 EntryTopbar에도 있다). 발송이 생기면 알림 설정 API
 * (lib/api/notifications의 getNotificationSettings · updateNotificationSettings)로 스위치를 되살린다.
 */
export function AccountNotificationsTab() {
  return (
    <Section title="알림">
      <p className="flex items-start gap-2 rounded-(--radius-8) bg-function-info-background px-3 py-2.5 type-content-s text-contents-light-bgd-default">
        <span className="mt-px shrink-0 text-function-info-default">
          <InfoIcon size={18} />
        </span>
        알림은 오른쪽 위 종 아이콘에서 볼 수 있어요
      </p>
    </Section>
  );
}

export function AccountDeleteTab({ user }: { user: User }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // 소속 상황에 따라 무엇이 사라지는지 조합한다 — 만든 스튜디오 · 만든 갤러리 · 초대받아 들어간 곳
  const ownsStudio = user.workspaces.some((w) => w.kind === "STUDIO" && w.role === "OWNER");
  const ownsGallery = user.workspaces.some((w) => w.kind === "GALLERY" && w.role === "OWNER");
  const invited = user.workspaces.some((w) => w.role === "MEMBER");
  const consequence = [
    ownsStudio && ownsGallery
      ? "내가 만든 스튜디오와 갤러리가 사진과 함께 삭제돼요."
      : ownsStudio
        ? "내가 만든 스튜디오와 그 안의 갤러리가 사진과 함께 삭제돼요."
        : ownsGallery
          ? "내가 만든 갤러리가 사진과 함께 삭제돼요."
          : null,
    invited ? "초대받아 들어간 스튜디오 · 갤러리에서는 빠져요." : null,
    !ownsStudio && !ownsGallery && !invited ? "계정 정보가 삭제돼요." : null,
    "되돌릴 수 없어요.",
  ]
    .filter((line): line is string => line !== null)
    .join(" ");

  async function withdraw() {
    await deleteMyAccount();
    track("account_deleted", { workspace_kinds: buildIdentifyProps(user).workspace_kinds });
    await logout();
    router.replace("/");
  }

  return (
    <Section title="회원 탈퇴">
      <DangerCard
        title="회원 탈퇴"
        desc={consequence}
        action={<DangerButton onClick={() => setOpen(true)}>탈퇴하기</DangerButton>}
      />
      {open && (
        <DangerConfirmModal
          title="정말 탈퇴할까요?"
          confirmLabel="탈퇴하기"
          busyLabel="탈퇴하는 중…"
          requireText="탈퇴"
          onConfirm={withdraw}
          onClose={() => setOpen(false)}
        >
          {consequence} 확인을 위해 &ldquo;탈퇴&rdquo;를 입력해 주세요.
        </DangerConfirmModal>
      )}
    </Section>
  );
}

"use client";

/**
 * 설정 › 계정 — 프로필 · 화면 · 알림 · 회원 탈퇴
 * 위치: src/app/(auth)/settings/_components/AccountTabs.tsx
 */

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DarkModeIcon, InfoIcon, LightModeIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { deleteMyAccount, updateNickname, type User } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
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
          <span className="mr-auto type-content-xs text-brand-secondary-dark">저장했어요</span>
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

export function AccountDisplayTab() {
  const { theme, setTheme } = useTheme();
  return (
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
                t.value === "dark" ? "bg-[#1A1A1A] text-[#F9F9F9]" : "bg-white text-[#1A1A1A]"
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

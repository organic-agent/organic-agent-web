"use client";

/**
 * 설정 › 계정 — 프로필 · 화면 · 알림 · 계정 삭제
 * 위치: src/app/(auth)/settings/_components/AccountTabs.tsx
 */

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DarkModeIcon, LightModeIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Toggle } from "@/components/ui/Toggle";
import { deleteMyAccount, updateNickname, type User } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from "@/lib/api/notifications";
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
        err instanceof ApiError ? err.message : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
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
      <div role="radiogroup" aria-label="테마" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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
        <div
          aria-disabled
          className="flex flex-col gap-2 rounded-(--radius-12) border border-dashed border-divider-default p-3.5 opacity-60"
        >
          <span className="grid h-11 place-items-center rounded-(--radius-8) border border-divider-default bg-[linear-gradient(90deg,#fff_50%,#1A1A1A_50%)]" />
          <span className="type-label-semibold-s text-contents-light-bgd-default">시스템 설정 따르기</span>
          <span className="-mt-1.5 type-content-xs text-contents-light-bgd-weakness">준비 중</span>
        </div>
      </div>
    </Section>
  );
}

export function AccountNotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getNotificationSettings();
        if (!cancelled) setSettings(res);
      } catch {
        if (!cancelled) setBanner("알림 설정을 불러오지 못했어요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function change(patch: Partial<NotificationSettings>) {
    if (!settings) return;
    const prev = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    setBanner(null);
    try {
      setSettings(await updateNotificationSettings(next));
    } catch (err) {
      setSettings(prev);
      setBanner(
        err instanceof ApiError ? err.message : "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      );
    }
  }

  const rows: ReadonlyArray<{ key: keyof NotificationSettings; label: string; desc: string }> = [
    { key: "emailEnabled", label: "이메일 알림", desc: "셀렉 제출 · 보정 요청 · 마감 임박을 이메일로 받아요" },
    { key: "browserEnabled", label: "브라우저 알림", desc: "이 브라우저가 열려 있을 때 바로 띄워요" },
  ];

  return (
    <Section title="알림 수신">
      <div className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 border-b border-divider-default py-3.5"
          >
            <div>
              <p className="type-content-m text-contents-light-bgd-default">{row.label}</p>
              <p className="type-content-xs text-contents-light-bgd-sub">{row.desc}</p>
            </div>
            {settings ? (
              <Toggle
                checked={settings[row.key]}
                onChange={(checked) => void change({ [row.key]: checked })}
                aria-label={row.label}
              />
            ) : (
              <span className="h-5 w-9 animate-pulse rounded-(--pill) bg-surface-default-light" />
            )}
          </div>
        ))}
      </div>
      {banner && (
        <p role="alert" className="mt-3 type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
    </Section>
  );
}

export function AccountDeleteTab({ user }: { user: User }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ownedStudios = user.workspaces.filter((w) => w.kind === "STUDIO" && w.role === "OWNER");

  async function withdraw() {
    await deleteMyAccount();
    await logout();
    router.replace("/");
  }

  return (
    <Section title="계정 삭제">
      <DangerCard
        title="회원 탈퇴"
        desc="소유한 스튜디오는 갤러리와 함께 삭제되고, 다른 스튜디오 소속과 클라이언트 갤러리 참여는 해제돼요."
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
          {ownedStudios.length > 0 && (
            <>
              소유한{" "}
              <span className="font-medium text-contents-light-bgd-default">
                {ownedStudios.map((w) => w.name).join(", ")}
              </span>
              은 갤러리와 함께 삭제돼요.{" "}
            </>
          )}
          다른 스튜디오 소속과 클라이언트 갤러리 참여는 해제되고, 되돌릴 수 없어요. 확인을 위해
          &ldquo;탈퇴&rdquo;를 입력해 주세요.
        </DangerConfirmModal>
      )}
    </Section>
  );
}

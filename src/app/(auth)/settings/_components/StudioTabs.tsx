"use client";

/**
 * 설정 › 스튜디오 — 정보 · 멤버 · 이용권 · 삭제(소유자) / 나가기(멤버)
 * 위치: src/app/(auth)/settings/_components/StudioTabs.tsx
 *
 * 역할은 StudioResponse.role. 멤버는 정보 읽기 전용 · 초대 없음 · 이용권 추가 없음 · 나가기만.
 */

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  InviteLinkBox,
  useStudioInviteLink,
} from "@/app/(studio)/studio/_components/InviteLinkBox";
import {
  STUDIO_ROLE_LABEL,
  sortStudioMembers,
} from "@/app/(studio)/studio/_components/StudioInviteModal";
import { TicketCheckoutModal } from "@/app/(studio)/studio/_components/TicketCheckoutModal";
import { CheckCircleIcon, CopyIcon, PlusIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { ApiError } from "@/lib/api/client";
import {
  deleteStudio,
  leaveStudio,
  listStudioMembers,
  removeStudioMember,
  updateStudio,
  type StudioMemberResponse,
  type StudioResponse,
} from "@/lib/api/studios";
import { useAuth } from "@/lib/auth/authStore";
import { updateStudioFromServer } from "@/lib/studio";
import { useStudioTickets } from "@/lib/studioTickets";
import { refreshMe } from "../_lib/refreshMe";
import { DangerConfirmModal } from "./DangerConfirmModal";
import {
  DangerButton,
  DangerCard,
  FieldLabel,
  InfoNote,
  ReadOnlyBox,
  Section,
} from "./SettingsShell";

const DESCRIPTION_MAX = 500;
const PUBLIC_URL_PREFIX = "easyselect.kr/studio/";

const isOwner = (studio: StudioResponse) => studio.role === "OWNER";

export function StudioInfoTab({
  studio,
  onUpdated,
}: {
  studio: StudioResponse;
  onUpdated: (studio: StudioResponse) => void;
}) {
  const id = useId();
  const owner = isOwner(studio);
  const [name, setName] = useState(studio.name);
  const [contact, setContact] = useState(studio.contact ?? "");
  const [description, setDescription] = useState(studio.description ?? "");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const dirty =
    name.trim() !== studio.name ||
    (contact.trim() || null) !== (studio.contact ?? null) ||
    (description.trim() || null) !== (studio.description ?? null);
  const valid = name.trim().length > 0;
  const publicUrl = `${PUBLIC_URL_PREFIX}${studio.galleryUrl}`;

  function reset() {
    setName(studio.name);
    setContact(studio.contact ?? "");
    setDescription(studio.description ?? "");
  }

  async function save() {
    if (!dirty || !valid || saving) return;
    setSaving(true);
    setBanner(null);
    try {
      const updated = await updateStudio(studio.workspaceId, {
        name: name.trim(),
        galleryUrl: studio.galleryUrl,
        contact: contact.trim() || null,
        description: description.trim() || null,
      });
      updateStudioFromServer(updated.name, updated.galleryUrl);
      onUpdated({ ...studio, ...updated, role: studio.role });
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

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(`https://${publicUrl}`);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setBanner("복사하지 못했어요. 주소를 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <Section title="스튜디오 정보">
      <div className="mb-5">
        <FieldLabel htmlFor={`${id}-name`}>스튜디오 이름</FieldLabel>
        {owner ? (
          <TextField
            id={`${id}-name`}
            value={name}
            onChange={setName}
            error={!valid}
            autoComplete="organization"
            className="h-12 px-4"
          />
        ) : (
          <ReadOnlyBox>{studio.name}</ReadOnlyBox>
        )}
      </div>
      <div className="mb-5">
        <FieldLabel>공개 주소</FieldLabel>
        <div className="flex gap-2">
          <ReadOnlyBox className="min-w-0 flex-1 truncate tabular-nums">{publicUrl}</ReadOnlyBox>
          <IconButton
            icon={
              copied ? (
                <span className="text-brand-secondary-dark">
                  <CheckCircleIcon size={20} />
                </span>
              ) : (
                <CopyIcon size={20} />
              )
            }
            aria-label={copied ? "복사됨" : "공개 주소 복사"}
            onClick={() => void copyUrl()}
            className="size-12 shrink-0 rounded-(--radius-8) border border-border-default"
          />
        </div>
      </div>
      <div className="mb-5">
        <FieldLabel htmlFor={`${id}-contact`} optional>
          연락처
        </FieldLabel>
        {owner ? (
          <TextField
            id={`${id}-contact`}
            value={contact}
            onChange={setContact}
            placeholder="예: 010-1234-5678"
            autoComplete="tel"
            className="h-12 px-4"
          />
        ) : (
          <ReadOnlyBox>{studio.contact ?? "없음"}</ReadOnlyBox>
        )}
      </div>
      <div className="mb-6">
        <FieldLabel htmlFor={`${id}-desc`} optional>
          소개
        </FieldLabel>
        {owner ? (
          <>
            <Textarea
              value={description}
              onChange={(v) => setDescription(v.slice(0, DESCRIPTION_MAX))}
              placeholder="클라이언트 갤러리 상단에 보여요"
              aria-label="소개"
              className="min-h-28"
            />
            <p className="mt-1.5 text-right type-content-xs text-contents-light-bgd-weakness tabular-nums">
              {description.length} / {DESCRIPTION_MAX}
            </p>
          </>
        ) : (
          <ReadOnlyBox className="py-3 whitespace-pre-wrap">{studio.description ?? "없음"}</ReadOnlyBox>
        )}
      </div>
      {banner && (
        <p role="alert" className="mb-4 type-content-xs text-function-error-default">
          {banner}
        </p>
      )}
      {owner ? (
        <div className="flex items-center justify-end gap-2">
          {saved && <span className="mr-auto type-content-xs text-brand-secondary-dark">저장했어요</span>}
          <Button kind="ghost" disabled={!dirty || saving} onClick={reset}>
            되돌리기
          </Button>
          <Button disabled={!dirty || !valid || saving} onClick={() => void save()}>
            {saving ? "저장하는 중…" : "저장"}
          </Button>
        </div>
      ) : (
        <InfoNote>스튜디오 정보는 소유자만 바꿀 수 있어요. 볼 수만 있어요.</InfoNote>
      )}
    </Section>
  );
}

export function StudioMembersTab({ studio }: { studio: StudioResponse }) {
  const owner = isOwner(studio);
  const auth = useAuth();
  const myUserId = auth.status === "authenticated" ? auth.user.id : null;
  const [members, setMembers] = useState<StudioMemberResponse[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [removing, setRemoving] = useState<StudioMemberResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listStudioMembers(studio.workspaceId);
        if (!cancelled) setMembers(sortStudioMembers(list));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studio.workspaceId]);

  async function remove(member: StudioMemberResponse) {
    await removeStudioMember(studio.workspaceId, member.memberId);
    setMembers((prev) => prev?.filter((m) => m.memberId !== member.memberId) ?? prev);
    setRemoving(null);
  }

  return (
    <Section title="멤버">
      {owner && <OwnerInviteCard workspaceId={studio.workspaceId} />}
      <table className="w-full border-collapse type-content-m">
        <thead>
          <tr className="border-b border-divider-default text-left type-content-xs text-contents-light-bgd-weakness">
            <th className="px-2 py-1.5 font-medium">이름</th>
            <th className="w-24 px-2 py-1.5 font-medium">역할</th>
            {owner && <th className="w-24 px-2 py-1.5" />}
          </tr>
        </thead>
        <tbody>
          {members === null ? (
            <tr>
              <td colSpan={3} className="px-2 py-4 type-content-xs text-contents-light-bgd-sub">
                {failed ? "멤버 목록을 불러오지 못했어요" : "불러오는 중…"}
              </td>
            </tr>
          ) : (
            members.map((m) => {
              const me = m.userId === myUserId;
              return (
                <tr key={m.memberId} className="border-b border-divider-default">
                  <td className="px-2 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar initial={m.nickname.trim().slice(0, 1) || "?"} />
                      <span className="min-w-0">
                        <span className="block truncate text-contents-light-bgd-default">
                          {m.nickname}
                          {me && (
                            <span className="ml-1 type-content-xs text-contents-light-bgd-weakness">
                              (나)
                            </span>
                          )}
                        </span>
                        <span className="block truncate type-content-xs text-contents-light-bgd-weakness">
                          {m.email ?? "이메일 없음"}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`rounded-(--pill) px-2 py-0.5 type-content-xs ${
                        m.role === "OWNER"
                          ? "bg-brand-secondary-background text-brand-secondary-dark"
                          : "bg-surface-default-light text-contents-light-bgd-sub"
                      }`}
                    >
                      {STUDIO_ROLE_LABEL[m.role]}
                    </span>
                  </td>
                  {owner && (
                    <td className="px-2 py-2.5 text-right">
                      {!me && m.role !== "OWNER" && (
                        <button
                          type="button"
                          onClick={() => setRemoving(m)}
                          className="cursor-pointer type-content-s text-function-error-default underline underline-offset-2"
                        >
                          내보내기
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {removing && (
        <DangerConfirmModal
          title={`${removing.nickname} 님을 내보낼까요?`}
          confirmLabel="내보내기"
          busyLabel="내보내는 중…"
          onConfirm={() => remove(removing)}
          onClose={() => setRemoving(null)}
        >
          이 스튜디오의 갤러리를 더 볼 수 없어요. 다시 초대하면 돌아올 수 있어요.
        </DangerConfirmModal>
      )}
    </Section>
  );
}

function OwnerInviteCard({ workspaceId }: { workspaceId: number }) {
  const invite = useStudioInviteLink(workspaceId);
  const link = invite.state;
  return (
    <div className="mb-5 rounded-(--radius-12) border border-divider-default px-4 py-3.5">
      <p className="mb-2 flex justify-between type-label-semibold-xs text-contents-light-bgd-default">
        <span>초대 링크</span>
        {link.kind === "ready" && (
          <span className="font-normal text-contents-light-bgd-weakness">
            {link.daysLeft}일 남음 ·{" "}
            {link.link.usedCount > 0 ? `${link.link.usedCount}명 들어옴` : "아직 아무도 안 들어옴"}
          </span>
        )}
      </p>
      <InviteLinkBox {...invite} />
    </div>
  );
}

export function StudioTicketsTab({ studio }: { studio: StudioResponse }) {
  const owner = isOwner(studio);
  const tickets = useStudioTickets(studio.workspaceId);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <Section title="이용권">
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-(--radius-12) bg-brand-secondary-background p-4">
          <p className="type-content-xs text-contents-light-bgd-sub">남은 이용권</p>
          <p className="type-title-xl text-brand-secondary-dark tabular-nums">
            {tickets.remaining}
            <span className="ml-1 type-content-s font-normal text-contents-light-bgd-sub">개</span>
          </p>
        </div>
        <div className="rounded-(--radius-12) border border-divider-default p-4">
          <p className="type-content-xs text-contents-light-bgd-sub">지금까지 구매</p>
          <p className="type-title-xl text-contents-light-bgd-default tabular-nums">
            {tickets.total}
            <span className="ml-1 type-content-s font-normal text-contents-light-bgd-sub">개</span>
          </p>
        </div>
      </div>
      {owner ? (
        <Button icon={<PlusIcon size={18} />} onClick={() => setCheckoutOpen(true)} className="mb-8">
          이용권 추가
        </Button>
      ) : (
        <div className="mb-8">
          <InfoNote>이용권 추가는 소유자만 할 수 있어요.</InfoNote>
        </div>
      )}
      <h4 className="mb-2 type-label-semibold-m text-contents-light-bgd-default">구매 내역</h4>
      <p className="rounded-(--radius-8) border border-dashed border-divider-default px-4 py-5 text-center type-content-xs text-contents-light-bgd-sub">
        구매 내역은 서버가 준비되면 여기에 보여요
      </p>
      {checkoutOpen && (
        <TicketCheckoutModal
          mode="add"
          workspaceId={studio.workspaceId}
          remaining={tickets.remaining}
          onClose={() => setCheckoutOpen(false)}
          onPurchased={() => setCheckoutOpen(false)}
        />
      )}
    </Section>
  );
}

export function StudioDangerTab({ studio }: { studio: StudioResponse }) {
  const router = useRouter();
  const owner = isOwner(studio);
  const [open, setOpen] = useState(false);

  async function remove() {
    await deleteStudio(studio.workspaceId);
    await refreshMe();
    router.replace("/");
  }

  async function leave() {
    await leaveStudio(studio.workspaceId);
    await refreshMe();
    router.replace("/");
  }

  if (!owner) {
    return (
      <Section title="스튜디오 나가기">
        <DangerCard
          title={`${studio.name} 나가기`}
          desc="나가면 이 스튜디오의 갤러리를 볼 수 없어요. 다시 들어오려면 초대 링크가 필요해요."
          action={<DangerButton onClick={() => setOpen(true)}>나가기</DangerButton>}
        />
        {open && (
          <DangerConfirmModal
            title="스튜디오를 나갈까요?"
            confirmLabel="나가기"
            busyLabel="나가는 중…"
            onConfirm={leave}
            onClose={() => setOpen(false)}
          >
            <span className="font-medium text-contents-light-bgd-default">{studio.name}</span>의
            갤러리를 더 볼 수 없어요. 다시 들어오려면 초대 링크가 필요해요.
          </DangerConfirmModal>
        )}
      </Section>
    );
  }

  return (
    <Section title="스튜디오 삭제">
      <DangerCard
        title={`${studio.name} 삭제`}
        desc="갤러리 · 사진 · 셀렉 기록 · 멤버가 모두 사라져요. 멤버에게 삭제 알림이 가요."
        action={<DangerButton onClick={() => setOpen(true)}>스튜디오 삭제</DangerButton>}
      />
      {open && (
        <DangerConfirmModal
          title="스튜디오를 삭제할까요?"
          confirmLabel="완전히 삭제"
          busyLabel="삭제하는 중…"
          requireText={studio.name}
          onConfirm={remove}
          onClose={() => setOpen(false)}
        >
          <span className="font-medium text-contents-light-bgd-default">{studio.name}</span>의
          갤러리 · 사진 · 셀렉 기록 · 멤버가 모두 사라지고 되돌릴 수 없어요. 확인을 위해 스튜디오
          이름을 입력해 주세요.
        </DangerConfirmModal>
      )}
    </Section>
  );
}

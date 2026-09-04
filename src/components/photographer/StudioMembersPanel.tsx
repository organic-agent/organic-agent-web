"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  changeStudioMemberRole,
  leaveStudio,
  listStudioMembers,
  type StudioMemberResponse,
} from "@/lib/api/studios";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  workspaceId: number | null;
  onClose: () => void;
};

export function StudioMembersPanel({ open, workspaceId, onClose }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<StudioMemberResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!open || workspaceId === null) return;
    let cancelled = false;
    void listStudioMembers(workspaceId)
      .then((items) => {
        if (!cancelled) {
          setMembers(items);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "구성원을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  async function toggleRole(member: StudioMemberResponse) {
    if (workspaceId === null) return;
    setBusyId(member.memberId);
    setError(null);
    try {
      const updated = await changeStudioMemberRole(
        workspaceId,
        member.memberId,
        member.role === "OWNER" ? "MEMBER" : "OWNER",
      );
      setMembers((current) => current?.map((item) => item.memberId === updated.memberId ? updated : item) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "역할을 변경하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLeave() {
    if (workspaceId === null) return;
    setBusyId(-1);
    setError(null);
    try {
      await leaveStudio(workspaceId);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "스튜디오에서 나가지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-6" role="dialog" aria-modal="true" aria-label="스튜디오 구성원">
      <section className="w-full max-w-xl rounded-(--radius-16) bg-bg-layer-default p-6 shadow-(--shadow-hover)">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="type-heading-card text-fg-neutral">스튜디오 구성원</h2>
            <p className="mt-1 type-body-small text-fg-neutral-muted">OWNER만 역할을 바꿀 수 있으며 마지막 OWNER는 보호됩니다.</p>
          </div>
          <button type="button" onClick={onClose} className="type-body-medium text-fg-neutral-muted">닫기</button>
        </div>
        {members === null && !error ? (
          <p className="py-8 text-center type-body-medium text-fg-neutral-muted">불러오는 중…</p>
        ) : (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {members?.map((member) => (
              <div key={member.memberId} className="flex items-center gap-3 rounded-(--radius-8) border border-stroke-neutral-muted p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate type-body-medium text-fg-neutral">{member.nickname}</p>
                  <p className="truncate type-body-small text-fg-neutral-muted">{member.email ?? `사용자 #${member.userId}`}</p>
                </div>
                <span className="type-label-button text-fg-neutral-muted">{member.role}</span>
                <Button size="sm" kind="ghost" disabled={busyId !== null} onClick={() => void toggleRole(member)}>
                  {member.role === "OWNER" ? "MEMBER로" : "OWNER로"}
                </Button>
              </div>
            ))}
          </div>
        )}
        {error && <p role="alert" className="mt-4 type-body-small text-fg-critical">{error}</p>}
        <div className="mt-5 flex justify-end">
          <Button kind="ghost" disabled={busyId !== null || workspaceId === null} onClick={() => void handleLeave()}>
            스튜디오 나가기
          </Button>
        </div>
      </section>
    </div>
  );
}

"use client";

/**
 * 초대 수락 확인 — 링크로 온 사람이 소셜 로그인 뒤 도착하는 곳
 * 위치: src/app/(auth)/invite/[token]/_components/InviteLanding.tsx
 *
 * 분기:
 *  - 복구 중(loading): 기다린다. guest로 속단해 로그인으로 보내면 로그인돼 있던
 *    사용자가 불필요한 로그인 화면을 본다.
 *  - guest: 로그인으로 보낸다(inviteToken을 실어 로그인 뒤 다시 여기로).
 *  - 로그인됨: 미리보기 API로 누가 어디로 부르는지 보여주고, 사용자가 "초대 수락하기"를
 *    누르면 수락한다. 서버는 로그인 시 자동 수락하지 않으므로 여기가 유일한 수락 지점이다.
 *
 * 카드 하나에 상태를 모두 담는다(I1). 유효하면 초대 정보와 수락 버튼, 만료·회수·정원
 * 초과·이미 멤버는 상태별 문구와 버튼, 없는 링크·내가 만든 갤러리 같은 오류도 같은 카드.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EntryTopbar } from "@/components/app/EntryTopbar";
import {
  ArrowRightIcon,
  HeartIcon,
  InfoIcon,
  PhotoIcon,
  UsersIcon,
  type IconProps,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import {
  acceptInvite,
  acceptPartnerInvite,
  previewInvite,
  type InviteAcceptResponse,
  type InviteKind,
  type InvitePreviewResponse,
  type InviteStatus,
} from "@/lib/api/invites";
import { useAuth } from "@/lib/auth/authStore";
import { logout } from "@/lib/auth/logout";

type Tone = "brand" | "ok" | "warn" | "bad";

const KIND: Record<
  InviteKind,
  {
    label: string;
    Icon: (props: IconProps) => ReactNode;
    /** 새 링크를 누구에게 요청하라고 할지 */
    ask: string;
    headline: (p: InvitePreviewResponse) => string;
    desc: ReactNode;
    destLabel: string;
  }
> = {
  GALLERY_MEMBER: {
    label: "갤러리 초대",
    Icon: PhotoIcon,
    ask: "작가님께",
    headline: (p) => `${p.studioName ?? "스튜디오"}의 갤러리에 초대받았어요`,
    desc: (
      <>
        수락하면 사진을 고르고 보정을 요청할 수 있어요.
        <br />
        함께 보는 분과 둘까지 들어올 수 있습니다.
      </>
    ),
    destLabel: "갤러리로 가기",
  },
  PERSONAL_PARTNER: {
    label: "파트너 초대",
    Icon: HeartIcon,
    ask: "초대한 분께",
    headline: () => "파트너의 갤러리에 초대받았어요",
    desc: "수락하면 같은 갤러리에서 함께 고를 수 있어요.",
    destLabel: "갤러리로 가기",
  },
  STUDIO_MEMBER: {
    label: "팀원 초대",
    Icon: UsersIcon,
    ask: "스튜디오에",
    headline: (p) => `${p.studioName ?? "스튜디오"} 팀에 초대받았어요`,
    desc: (
      <>
        수락하면 스튜디오 작업 공간에서
        <br />
        갤러리를 함께 관리할 수 있어요.
      </>
    ),
    destLabel: "스튜디오로 가기",
  },
};

// 유효하지 않은 초대 — 수락 버튼 대신 상태별 문구와 버튼
const STATUS: Record<
  Exclude<InviteStatus, "ACTIVE">,
  { tone: Tone; title: string; desc: (ask: string) => string; action: "dest" | "home" }
> = {
  ALREADY_MEMBER: {
    tone: "ok",
    title: "이미 함께하고 있어요",
    desc: () => "이 초대는 벌써 수락했어요. 바로 들어가면 됩니다.",
    action: "dest",
  },
  EXPIRED: {
    tone: "warn",
    title: "만료된 초대 링크예요",
    desc: (ask) => `${ask} 새 초대 링크를 요청해주세요.`,
    action: "home",
  },
  REVOKED: {
    tone: "warn",
    title: "회수된 초대 링크예요",
    desc: (ask) => `이 링크는 거둬들여졌어요. ${ask} 새 초대 링크를 요청해주세요.`,
    action: "home",
  },
  FULL: {
    tone: "bad",
    title: "정원이 가득 찼어요",
    desc: (ask) => `이 갤러리에는 더 들어올 자리가 없어요. ${ask} 문의해주세요.`,
    action: "home",
  },
};

// 조회·수락이 오류로 끝난 경우. 백엔드가 404와 410을 나눠둔 의도를 문구에 반영한다.
const ERRORS: Record<string, { title: string; desc: string }> = {
  GALLERY_404_3: {
    title: "존재하지 않는 초대 링크예요",
    desc: "주소가 정확한지 확인해주세요. 링크가 잘린 채 전달됐을 수도 있어요.",
  },
  GALLERY_410_1: { title: "만료된 초대 링크예요", desc: "새 초대 링크를 요청해주세요." },
  GALLERY_410_2: {
    title: "회수된 초대 링크예요",
    desc: "이 링크는 거둬들여졌어요. 새 초대 링크를 요청해주세요.",
  },
  GALLERY_403_3: {
    title: "내가 만든 갤러리의 초대예요",
    desc: "담당 작가는 자기 갤러리의 초대를 수락할 수 없어요.",
  },
  GALLERY_403_5: {
    title: "정원이 가득 찼어요",
    desc: "이 갤러리에는 더 들어올 자리가 없어요. 초대한 분께 문의해주세요.",
  },
};
const FALLBACK_ERROR = {
  title: "초대를 확인하지 못했어요",
  desc: "네트워크 상태를 확인하고 잠시 후 다시 시도해주세요.",
};

const TONE_BG: Record<Tone, string> = {
  brand: "bg-brand-secondary-background text-brand-secondary-dark",
  ok: "bg-function-success-surface text-contents-light-bgd-default",
  warn: "bg-function-warning-surface text-contents-light-bgd-default",
  bad: "bg-function-error-surface text-contents-light-bgd-default",
};
const TONE_ICON: Record<Tone, string> = {
  brand: "text-brand-secondary-default",
  ok: "text-function-success-default",
  warn: "text-function-warning-default",
  bad: "text-function-error-default",
};

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });

/** 수락 뒤(또는 이미 멤버일 때) 갈 곳 — 갤러리가 있으면 갤러리, 없으면(팀원 초대) 스튜디오 */
function destinationOf(r: { galleryId: number | null; workspaceId: number }): string {
  return r.galleryId !== null ? `/gallery/${r.galleryId}` : `/studio/${r.workspaceId}`;
}

type View =
  | { kind: "loading" }
  | { kind: "preview"; data: InvitePreviewResponse }
  | { kind: "error"; code: string };

export function InviteLanding({ token }: { token: string }) {
  const router = useRouter();
  const auth = useAuth();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (auth.status === "loading") return;
    if (auth.status === "guest") {
      const query = new URLSearchParams({ role: "couple", inviteToken: token });
      router.replace(`/login?${query.toString()}`);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await previewInvite(token);
        if (!cancelled) setView({ kind: "preview", data });
      } catch (err) {
        if (!cancelled)
          setView({ kind: "error", code: err instanceof ApiError ? err.code : "network" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.status, token, router]);

  // 잘못된 계정으로 링크를 연 경우 — 로그아웃 뒤 초대 토큰을 실어 로그인으로, 로그인하면 다시 여기로
  async function switchAccount() {
    await logout();
    const query = new URLSearchParams({ role: "couple", inviteToken: token });
    router.replace(`/login?${query.toString()}`);
  }
  const switchButton = (
    <Button kind="ghost" onClick={switchAccount} className="w-full">
      다른 계정으로 로그인
    </Button>
  );

  async function accept(kind: InviteKind) {
    setAccepting(true);
    try {
      const accepted: InviteAcceptResponse =
        kind === "PERSONAL_PARTNER"
          ? await acceptPartnerInvite(token)
          : await acceptInvite(token);
      router.replace(destinationOf(accepted));
    } catch (err) {
      setAccepting(false);
      setView({ kind: "error", code: err instanceof ApiError ? err.code : "network" });
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background-default-main">
      <EntryTopbar />
      <div className="grid flex-1 place-items-center px-6 py-14">
        {view.kind === "loading" ? (
          <p className="type-content-xs text-contents-light-bgd-sub animate-pulse">
            초대를 확인하고 있어요…
          </p>
        ) : view.kind === "error" ? (
          <Card
            tone="bad"
            badge={(ERRORS[view.code] ?? FALLBACK_ERROR).title}
            Icon={InfoIcon}
            title={(ERRORS[view.code] ?? FALLBACK_ERROR).title}
            desc={(ERRORS[view.code] ?? FALLBACK_ERROR).desc}
            actions={
              <>
                <Button href="/" className="w-full">
                  홈으로
                </Button>
                {switchButton}
              </>
            }
          />
        ) : (
          <PreviewCard
            data={view.data}
            accepting={accepting}
            onAccept={accept}
            secondary={switchButton}
          />
        )}
      </div>
    </main>
  );
}

function PreviewCard({
  data,
  accepting,
  onAccept,
  secondary,
}: {
  data: InvitePreviewResponse;
  accepting: boolean;
  onAccept: (kind: InviteKind) => void;
  /** 주 버튼 아래 보조 동작 — "다른 계정으로 로그인" */
  secondary: ReactNode;
}) {
  const k = KIND[data.kind];
  const name = [data.studioName, data.galleryTitle].filter(Boolean).join(" · ");

  if (data.status !== "ACTIVE") {
    const st = STATUS[data.status];
    return (
      <Card
        tone={st.tone}
        badge={st.title}
        Icon={InfoIcon}
        name={name || undefined}
        title={st.title}
        desc={st.desc(k.ask)}
        actions={
          <>
            {st.action === "dest" ? (
              <Button href={destinationOf(data)} icon={<ArrowRightIcon />} className="w-full">
                {k.destLabel}
              </Button>
            ) : (
              <Button href="/" className="w-full">
                홈으로
              </Button>
            )}
            {secondary}
          </>
        }
      />
    );
  }

  const meta = [
    `만료 ${dateFormat.format(new Date(data.expiresAt))}`,
    data.remainingUses !== null ? `남은 자리 ${data.remainingUses}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      tone="brand"
      badge={k.label}
      Icon={k.Icon}
      name={name || undefined}
      meta={meta}
      title={k.headline(data)}
      desc={k.desc}
      details={[
        data.studioName ? ["스튜디오", data.studioName] : null,
        data.galleryTitle ? ["갤러리", data.galleryTitle] : null,
        ["초대 종류", k.label],
        ["만료", dateFormat.format(new Date(data.expiresAt))],
      ].filter((row): row is [string, string] => row !== null)}
      actions={
        <>
          <Button
            size="lg"
            icon={accepting ? undefined : <ArrowRightIcon />}
            disabled={accepting}
            onClick={() => onAccept(data.kind)}
            className="w-full"
          >
            {accepting ? "수락하는 중…" : "초대 수락하기"}
          </Button>
          {secondary}
        </>
      }
    />
  );
}

/* ───────────────── 카드 골격 — 상태가 달라도 같은 자리에 같은 순서로 ───────────────── */

function Card({
  tone,
  badge,
  Icon,
  name,
  meta,
  title,
  desc,
  details,
  actions,
}: {
  tone: Tone;
  badge: string;
  Icon: (props: IconProps) => ReactNode;
  /** 스튜디오·갤러리 이름 — 있으면 제목 위에 크게 */
  name?: string;
  meta?: string;
  title: string;
  desc: ReactNode;
  details?: [string, string][];
  actions: ReactNode;
}) {
  return (
    <section
      aria-labelledby="invite-title"
      className="flex w-full max-w-120 flex-col items-center gap-5 rounded-(--radius-16) border border-divider-default bg-background-default-main p-8 text-center"
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-(--pill) px-2.5 py-1 type-label-semibold-xs ${TONE_BG[tone]}`}
      >
        <Icon size={16} className={TONE_ICON[tone]} />
        {badge}
      </span>

      <div className="flex flex-col items-center gap-2.5">
        <span
          className={`grid size-16 place-items-center rounded-(--radius-16) ${TONE_BG[tone]}`}
        >
          <Icon size={30} className={TONE_ICON[tone]} />
        </span>
        {name && (
          <p className="type-title-l text-balance text-contents-light-bgd-default">{name}</p>
        )}
        {meta && <p className="type-content-xs text-contents-light-bgd-weakness">{meta}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <h1
          id="invite-title"
          className={`text-balance text-contents-light-bgd-default ${name ? "type-title-m" : "type-title-xl"}`}
        >
          {title}
        </h1>
        <p className="type-content-m text-contents-light-bgd-sub">{desc}</p>
      </div>

      {details && details.length > 0 && (
        <dl className="w-full border-t border-divider-default">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-3 border-b border-divider-default py-2.5 type-content-s"
            >
              <dt className="text-contents-light-bgd-weakness">{label}</dt>
              <dd className="text-right font-medium text-contents-light-bgd-default">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex w-full flex-col items-center gap-2.5">{actions}</div>
    </section>
  );
}

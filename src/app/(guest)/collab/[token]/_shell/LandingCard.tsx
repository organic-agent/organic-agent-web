"use client";

/**
 * 링크 열기 — 표지 카드(작가 · 제목 · 앨범 행 · 사진 보러 가기) · 못 여는 링크 카드
 * 위치: src/app/(guest)/collab/[token]/_shell/LandingCard.tsx
 *
 * 앨범 행은 정보만(누르지 않음) — 아래 버튼 하나로 들어간다(2026-09-13). 공유폴더가 1개여도 같은 카드에 행 하나.
 */

import { BrandLogo } from "@/components/BrandLogo";
import { ArrowRightIcon, ErrorIcon, FolderIcon, LockIcon, ScheduleIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import type { CollabLandingResponse, GuestLinkProblem } from "@/lib/api/collabGuest";

export function LandingCard({ landing, title, onGo }: { landing: CollabLandingResponse; title: string; onGo: () => void }) {
  const albums = landing.albums;
  const total = albums.reduce((n, a) => n + a.photoCount, 0) || landing.photoCount;
  return (
    <div className="flex w-full max-w-115 flex-col items-center gap-2 rounded-(--radius-16) border border-border-default bg-background-default-main px-8 pt-9 pb-7 text-center">
      <BrandLogo size={40} className="mb-1 text-brand-secondary-default" />
      {landing.coverAuthor && <span className="type-label-semibold-xs tracking-wide text-contents-light-bgd-weakness">{landing.coverAuthor}</span>}
      <h1 className="type-title-xl leading-tight text-contents-light-bgd-default text-balance">{title}</h1>
      <p className="type-content-m text-contents-light-bgd-sub">{albums.length > 1 ? `공유 앨범 ${albums.length}개 · ${total}장` : `${total}장`}</p>
      {albums.length > 0 && (
        <ul className="mt-2 flex w-full flex-col gap-1.5">
          {albums.map((a) => (
            <li key={a.sessionId} className="flex items-center gap-3 rounded-(--radius-12) border border-border-default px-3 py-2.5 text-left">
              <span className="grid size-11 shrink-0 place-items-center rounded-(--radius-8) bg-brand-secondary-background text-brand-secondary-dark">
                <FolderIcon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate type-label-semibold-m text-contents-light-bgd-default">{a.name}</b>
                <small className="type-content-xs text-contents-light-bgd-weakness">{a.photoCount}장</small>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button size="lg" onClick={onGo} className="mt-4 w-full">
        사진 보러 가기
        <ArrowRightIcon size={18} />
      </Button>
    </div>
  );
}

const PROBLEMS: Record<GuestLinkProblem | "error", { icon: React.ReactNode; title: string; body: string }> = {
  expired: { icon: <ScheduleIcon size={28} />, title: "링크 기간이 끝났어요", body: "보내 준 분께 새 링크를 부탁해 주세요" },
  revoked: { icon: <LockIcon size={28} />, title: "더 볼 수 없는 링크예요", body: "보내 준 분이 이 링크를 닫았어요" },
  notFound: { icon: <ErrorIcon size={28} />, title: "주소가 맞지 않아요", body: "받은 메시지의 링크를 다시 눌러 주세요" },
  notReady: { icon: <ScheduleIcon size={28} />, title: "아직 준비 중인 앨범이에요", body: "조금 뒤에 다시 열어 주세요" },
  error: { icon: <ErrorIcon size={28} />, title: "불러오지 못했어요", body: "네트워크 연결을 확인한 뒤 다시 시도해 주세요" },
};

export function GoneCard({ problem, onRetry }: { problem: GuestLinkProblem | "error"; onRetry?: () => void }) {
  const p = PROBLEMS[problem];
  return (
    <div className="flex w-full max-w-105 flex-col items-center gap-2 rounded-(--radius-16) border border-border-default bg-background-default-main px-7 pt-9 pb-7 text-center">
      <span className="mb-1 grid size-14 place-items-center rounded-full bg-surface-default-light text-contents-light-bgd-sub">{p.icon}</span>
      <h1 className="type-title-m text-contents-light-bgd-default">{p.title}</h1>
      <p className="type-content-s text-contents-light-bgd-sub">{p.body}</p>
      {problem === "error" && onRetry && (
        <Button kind="ghost" onClick={onRetry} className="mt-3 border border-border-default">
          다시 시도
        </Button>
      )}
    </div>
  );
}

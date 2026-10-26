/**
 * 랜딩 흐름 01 사진 업로드 — 개인 갤러리(사진 없음) 위에 업로드 모달이 떠 있고, 파일마다 막대가 차오른다
 * 위치: src/app/_components/shots/UploadShot.tsx
 *
 * 뒤 화면: 상단바(업로드 단계) · 사이드바(사진 0) · 빈 갤러리 안내(PersonalEmptyGuide 그대로) · 하단 바(ShellBottomBar 그대로).
 * 모달: UploadModal의 파일 목록 모양에 줄마다 진행 막대를 더한 것 — 실제 제품은 모달이 닫힌 뒤 하단 바에 막대 하나를
 * 보이지만, 랜딩에서는 "사진이 올라가는 중"이 한눈에 보이게 줄마다 막대를 둔다(2026-10-26 수민).
 * 움직임: Reveal(seq)이 켜 주는 data-seq 순서대로 줄의 막대가 차고 용량 자리가 "완료"로 바뀐다. 움직임 줄이기면 끝 상태.
 */

import { PersonalEmptyGuide } from "@/app/(client)/gallery/[galleryId]/_shell/PersonalEmptyGuide";
import { ShellBottomBar, ShellCta } from "@/app/(studio)/studio/gallery/[galleryId]/_shell/ShellBottomBar";
import { CloseIcon, PhotoIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { ShotFrame } from "./ShotFrame";
import { ShotSidebar, ShotTopbar } from "./ShotChrome";

const FILES = [
  ["IMG_0001.jpg", "2.1MB"],
  ["IMG_0026.jpg", "1.9MB"],
  ["IMG_0051.jpg", "2.3MB"],
  ["IMG_0101.jpg", "1.8MB"],
  ["IMG_0002.jpg", "2.0MB"],
  ["IMG_0027.jpg", "2.2MB"],
] as const;

const noop = () => {};

export function UploadShot() {
  return (
    <ShotFrame label="사진 업로드 화면 — 업로드 모달에서 사진 여섯 장이 차례로 올라간다">
      <ShotTopbar stageIndex={0} />
      <div className="flex min-h-0 flex-1">
        <ShotSidebar status="사진 없음" photoCount={0} />
        <div className="flex min-w-0 flex-1 flex-col">
          <PersonalEmptyGuide />
        </div>
      </div>
      <ShellBottomBar
        selectionCount={0}
        onClearSelection={noop}
        onMoveSelection={noop}
        hint="올리면 AI가 컨셉 · 세부 폴더로 나눠요"
        actions={
          <ShellCta>
            <UploadIcon size={18} />
            사진 업로드
          </ShellCta>
        }
      />

      {/* 업로드 모달 — GalleryModalShell + UploadModal 모양. fixed 대신 absolute(화면 틀 안) */}
      <div className="absolute inset-0 z-10 grid place-items-center px-4">
        <div className="absolute inset-0 bg-surface-default-medium backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-105 rounded-(--radius-16) bg-background-default-main p-8 shadow-(--shadow-modal)">
          <span className="absolute top-5 right-5 inline-flex p-1 text-contents-light-bgd-default">
            <CloseIcon />
          </span>
          <h3 className="mb-6 pr-8 type-title-xl text-contents-light-bgd-default">사진 업로드</h3>
          <ul className="mb-2 flex flex-col">
            {FILES.map(([name, size], i) => (
              <li
                key={name}
                data-seq={300 + i * 520}
                className="group flex items-center gap-2.5 rounded-(--radius-4) px-1.5 py-1.5 type-content-s"
              >
                <span className="flex shrink-0 text-contents-light-bgd-weakness">
                  <PhotoIcon size={18} />
                </span>
                <span className="w-30 shrink-0 truncate text-contents-light-bgd-default">{name}</span>
                <span className="block h-1 min-w-0 flex-1 overflow-hidden rounded-(--pill) bg-surface-default-light">
                  <span className="block h-full w-0 rounded-(--pill) bg-brand-secondary-default motion-safe:transition-[width] motion-safe:duration-[900ms] motion-safe:ease-(--ease-out) group-[.seq-go]:w-full" />
                </span>
                <span className="w-11 shrink-0 text-right type-content-xs tabular-nums">
                  <span className="text-contents-light-bgd-weakness group-[.seq-go]:hidden">{size}</span>
                  <span className="hidden text-brand-secondary-dark group-[.seq-go]:inline">완료</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mb-5 flex items-center justify-between gap-3 px-1 type-content-xs text-contents-light-bgd-sub">
            <span className="tabular-nums">6장 · 12.3MB</span>
            <span>컨셉 수 건너뜀</span>
          </div>
          <div className="flex gap-2">
            <Button kind="ghost" className="flex-1">
              사진 더 가져오기
            </Button>
            <Button className="flex-1" disabled>
              업로드 중…
            </Button>
          </div>
        </div>
      </div>
    </ShotFrame>
  );
}

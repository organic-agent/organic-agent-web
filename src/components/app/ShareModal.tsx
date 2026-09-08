"use client";

/**
 * 공유 및 초대 모달 — 피그마 Modal/Share 세트(tab=permissions/design/invite) 대응
 * 위치: src/components/app/ShareModal.tsx
 *
 * 확정 디자인(2026-08-13): 링크 복사 배너 없음, 공개 범위는 테두리 셀렉트 행, 푸터는 완료 단일 버튼.
 * - 공개 범위: 비공개(초대한 사람만) / 공개(모든 사람) 2택 드롭다운 (로컬 데모 상태)
 * - 디자인 탭: 제목·작성자를 직접 입력, "완료"를 눌러야 저장되고 게스트 표지에 반영된다
 *   (shareDesign 로컬 스토어 — ESC·X는 버림. 초기값 리셋을 위해 부모가 열 때마다 마운트)
 * - 토글·멤버는 백엔드 연동 전 데모 상태다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { TabItem } from "@/components/ui/TabItem";
import { TextField } from "@/components/ui/TextField";
import { ToggleField } from "@/components/ui/Toggle";
import { Avatar } from "@/components/ui/Avatar";
import { saveShareDesign, useShareDesign } from "@/lib/couple";
import {
  CloseIcon,
  DropdownIcon,
  LockIcon,
  UsersIcon,
} from "@/components/icons";

type ShareTab = "permissions" | "design" | "invite";
type Visibility = "private" | "public";

// 백엔드 연동 전 mock — 게스트 초대 흐름이 붙으면 실데이터로 교체
const MOCK_PENDING = [{ initial: "수", name: "수진", status: "수락 대기" }];
const MOCK_MEMBERS = [
  { initial: "지", name: "지수", status: "참여 가능" },
  { initial: "어", name: "어머니", status: "보기 전용" },
];

const VISIBILITY_OPTIONS: {
  key: Visibility;
  label: string;
  Icon: typeof LockIcon;
}[] = [
  { key: "private", label: "비공개 · 초대한 사람만", Icon: LockIcon },
  { key: "public", label: "공개 · 모든 사람", Icon: UsersIcon },
];

function MemberRow({
  initial,
  name,
  status,
}: {
  initial: string;
  name: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar initial={initial} />
      <span className="type-content-m text-contents-light-bgd-default">{name}</span>
      <span className="ml-2 type-content-xs text-contents-light-bgd-sub">
        {status}
      </span>
    </div>
  );
}

/** 초대 탭의 접히는 섹션 (보류 중 / 멤버) */
function CollapsibleSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-1 text-contents-light-bgd-default"
      >
        <DropdownIcon
          size={16}
          className={`transition-transform duration-fast ${open ? "" : "-rotate-90"}`}
        />
        <span className="type-label-semibold-xs">{label}</span>
      </button>
      {open && children}
    </div>
  );
}

export function ShareModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ShareTab>("permissions");
  // 공개 범위 데모 상태 + 드롭다운 열림
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);
  // 권한 탭 데모 상태
  const [allowRequests, setAllowRequests] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  // 디자인 탭 — 저장된 값으로 시작하는 임시 편집본 (완료를 눌러야 저장)
  const stored = useShareDesign();
  const [showTitle, setShowTitle] = useState(stored.showTitle);
  const [title, setTitle] = useState(stored.title);
  const [showAuthor, setShowAuthor] = useState(stored.showAuthor);
  const [author, setAuthor] = useState(stored.author);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  // 공개 범위 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    if (!visibilityOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (
        visibilityRef.current &&
        !visibilityRef.current.contains(e.target as Node)
      ) {
        setVisibilityOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [visibilityOpen]);

  function handleComplete() {
    saveShareDesign({
      showTitle,
      title: title.trim() || "공유 앨범",
      showAuthor,
      author: author.trim(),
    });
    onClose();
  }

  if (!open) return null;

  const currentVisibility = VISIBILITY_OPTIONS.find(
    (o) => o.key === visibility,
  )!;

  return (
    <div className="fixed inset-0 z-150 grid place-items-center px-4">
      {/* Backdrop — bg.overlay 토큰 */}
      <div
        className="absolute inset-0 bg-surface-default-medium backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-120 flex-col gap-4 rounded-(--radius-16) bg-background-default-main p-6 shadow-(--shadow-modal)">
        {/* 헤더 */}
        <div className="flex w-full items-center justify-between border-b border-divider-default pb-2">
          <h2 className="type-title-l text-contents-light-bgd-default">공유 및 초대</h2>
          <IconButton icon={<CloseIcon />} onClick={onClose} aria-label="닫기" />
        </div>

        {/* 공개 범위 셀렉트 행 (비공개·초대한 사람만 / 공개·모든 사람) — 피그마 scope 행 */}
        <div ref={visibilityRef} className="relative w-full">
          <button
            type="button"
            onClick={() => setVisibilityOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={visibilityOpen}
            className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-(--radius-8) border border-border-default px-3 text-contents-light-bgd-default transition-colors duration-fast hover:bg-surface-default-lightness"
          >
            <currentVisibility.Icon size={16} />
            <span className="flex-1 text-left type-content-m">
              {currentVisibility.label}
            </span>
            <DropdownIcon
              size={16}
              className={`transition-transform duration-fast ${visibilityOpen ? "rotate-180" : ""}`}
            />
          </button>
          {visibilityOpen && (
            <div
              role="listbox"
              className="absolute left-0 top-full z-20 mt-2 flex w-full flex-col rounded-(--radius-8) border border-divider-default bg-background-default-main p-1 shadow-(--shadow-hover)"
            >
              {VISIBILITY_OPTIONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={key === visibility}
                  onClick={() => {
                    setVisibility(key);
                    setVisibilityOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-(--radius-4) px-3 py-2 text-left type-content-m transition-colors duration-fast hover:bg-surface-default-lightness ${
                    key === visibility
                      ? "bg-surface-default-lightness text-contents-light-bgd-default"
                      : "text-contents-light-bgd-sub"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 탭 */}
        <div
          role="tablist"
          className="flex w-full items-center gap-4 border-b border-divider-default"
        >
          <TabItem
            label="권한"
            active={tab === "permissions"}
            onClick={() => setTab("permissions")}
          />
          <TabItem
            label="디자인"
            active={tab === "design"}
            onClick={() => setTab("design")}
          />
          <TabItem
            label="초대"
            active={tab === "invite"}
            onClick={() => setTab("invite")}
          />
        </div>

        {/* 탭 내용 */}
        {tab === "permissions" && (
          <div className="flex w-full flex-col gap-2">
            <ToggleField
              label="액세스 요청 허용"
              checked={allowRequests}
              onChange={setAllowRequests}
              description="켜면 게스트가 요청 후 부부의 수락을 받아야 앨범에 들어올 수 있어요"
            />
            <ToggleField
              label="좋아요·댓글 허용"
              checked={allowReactions}
              onChange={setAllowReactions}
            />
            <ToggleField
              label="메타데이터 표시"
              checked={showMetadata}
              onChange={setShowMetadata}
            />
          </div>
        )}

        {tab === "design" && (
          <div className="flex w-full flex-col gap-3">
            <div className="flex w-full flex-col gap-2">
              <ToggleField
                label="제목"
                checked={showTitle}
                onChange={setShowTitle}
              />
              {showTitle && (
                <div className="pl-12">
                  <TextField
                    value={title}
                    onChange={setTitle}
                    placeholder="예: 우리의 본식 촬영"
                    aria-label="공유 앨범 제목"
                    className="h-10"
                  />
                </div>
              )}
            </div>
            <div className="flex w-full flex-col gap-2">
              <ToggleField
                label="작성자"
                checked={showAuthor}
                onChange={setShowAuthor}
              />
              {showAuthor && (
                <div className="pl-12">
                  <TextField
                    value={author}
                    onChange={setAuthor}
                    placeholder="예: 영식 · 영자"
                    aria-label="작성자 이름"
                    className="h-10"
                  />
                </div>
              )}
            </div>
            <p className="type-content-xs text-contents-light-bgd-sub">
              완료를 누르면 게스트에게 보이는 앨범 표지에 반영돼요.
            </p>
          </div>
        )}

        {tab === "invite" && (
          <div className="flex w-full flex-col gap-4">
            <CollapsibleSection label="보류 중">
              <div className="flex w-full flex-col gap-2">
                {MOCK_PENDING.map((m) => (
                  <MemberRow key={m.name} {...m} />
                ))}
              </div>
            </CollapsibleSection>
            <CollapsibleSection label="멤버">
              <div className="flex w-full flex-col gap-2">
                {MOCK_MEMBERS.map((m) => (
                  <MemberRow key={m.name} {...m} />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* 푸터 — 완료 단일 버튼 (확정 디자인). 닫기는 ESC·X·오버레이 클릭 */}
        <div className="flex w-full items-center justify-end border-t border-divider-default px-1 pt-3">
          <Button onClick={handleComplete}>완료</Button>
        </div>
      </div>
    </div>
  );
}

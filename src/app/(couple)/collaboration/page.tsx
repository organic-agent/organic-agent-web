"use client";

/**
 * 부부 — 협업 셀렉 (폴더 목록)
 * 위치: src/app/(couple)/collaboration/page.tsx
 *
 * ⚠️ 지금은 UI만. 세션·API 로직은 회의 후 연결.
 *    - 폴더 데이터는 목업. 실제로는 GET /api/v1/collab-folders.
 *    - 폴더는 사진 화면에서 "협업 셀렉 보내기"로 생성됨.
 *    - 폴더 클릭 시 /collaboration/[folderId]로 이동.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import {
  createFolder,
  deleteFolder,
  photoUrl,
  updateFolder,
  useFolders,
  type CollabFolder,
} from "@/lib/couple";
import { CreateCollaborationFolderModal } from "./_components/CreateCollaborationFolderModal";
import { CollaborationShareModal } from "./_components/CollaborationShareModal";

const SHARE_CODE = "8391";
const SHARE_EXPIRES_IN = "7일 후 만료";

const SIDEBAR = [
  {
    key: "gallery",
    label: "카테고리 갤러리",
    href: "/gallery",
    icon: "M4 4h16v16H4zM4 12h16M12 4v16",
  },
  {
    key: "selected",
    label: "선택 앨범",
    href: "/selected",
    icon: "M5 3h14v18l-7-4-7 4z",
  },
  {
    key: "collaboration",
    label: "협업 셀렉",
    href: "/collaboration",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    active: true,
  },
];

function FolderMenu({
  folder,
  onEdit,
  onDelete,
}: {
  folder: CollabFolder;
  onEdit: (folder: CollabFolder) => void;
  onDelete: (folder: CollabFolder) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="absolute right-4 bottom-4 z-10">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`${folder.name} 협업 폴더 관리 메뉴`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-8 h-8 rounded-full border border-transparent text-ink-3 grid place-items-center hover:text-ink hover:border-line hover:bg-paper-deep transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5h.01M12 12h.01M12 19h.01" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-[calc(100%+6px)] w-[132px] rounded-lg border border-line bg-white shadow-md py-1.5"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit(folder);
            }}
            className="w-full px-4 py-2.5 text-left text-[13px] text-ink-2 hover:bg-paper-deep hover:text-ink transition-colors"
          >
            수정
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete(folder);
            }}
            className="w-full px-4 py-2.5 text-left text-[13px] text-danger hover:bg-danger/10 transition-colors"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export default function CollaborationPage() {
  const folders = useFolders();
  const [editingFolder, setEditingFolder] = useState<CollabFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<CollabFolder | null>(null);
  const [editName, setEditName] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  function openEdit(folder: CollabFolder) {
    setEditingFolder(folder);
    setEditName(folder.name);
    setEditMemo(folder.memo);
  }

  function saveEdit() {
    if (!editingFolder || !editName.trim()) return;
    updateFolder(editingFolder.id, {
      name: editName.trim(),
      memo: editMemo.trim(),
    });
    setEditingFolder(null);
  }

  function confirmDelete() {
    if (!deletingFolder) return;
    deleteFolder(deletingFolder.id);
    setDeletingFolder(null);
  }

  function createEmptyFolder(input: { name: string; memo: string }) {
    createFolder({ ...input, photos: [] });
    setCreateOpen(false);
  }

  return (
    <div className="min-h-dvh bg-white flex">
      {/* ═══ 사이드바 (공용 컴포넌트) ═══ */}
      <AppSidebar
        menu={SIDEBAR}
        subtitle={{ title: "민준 & 서연", caption: "스튜디오 이름" }}
        user={{ initial: "서", name: "서연", role: "신부" }}
        homeHref="/gallery"
      />

      {/* ═══ 메인 ═══ */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b border-line sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <h1 className="font-display-ko font-medium text-[20px] text-ink leading-none">
            협업 셀렉
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              disabled={folders.length === 0}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-pill border border-line bg-white text-ink-2 text-[13px] font-medium hover:border-line-strong hover:text-ink transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              공유
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-pill bg-ink text-on-ink text-[13px] font-medium hover:-translate-y-px hover:bg-[#333] transition-all"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              협업 폴더 만들기
            </button>
          </div>
        </header>

        <div className="h-17 px-6 md:px-8 border-b border-line flex items-center">
          <p className="text-[14px] text-ink-2">
            사진 화면에서 고른 사진을 폴더로 묶어, 가족·지인과 함께
            이모지·의견을 나눠요.
          </p>
        </div>

        {/* 폴더 목록 */}
        <div className="px-6 md:px-8 py-8">
          {folders.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-[14px] text-ink-2 mb-1">
                아직 만든 폴더가 없어요
              </p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="text-[13px] text-accent hover:text-accent-press underline underline-offset-2"
              >
                협업 폴더 만들기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {folders.map((f) => (
                <div
                  key={f.id}
                  className="group relative border border-line rounded-lg overflow-hidden bg-white hover:shadow-md hover:-translate-y-1 transition-all"
                >
                  <Link href={`/collaboration/${f.id}`} className="block">
                    {/* 커버: 담긴 사진 미리보기 */}
                    <div className="relative aspect-[16/10] bg-paper-deep overflow-hidden">
                      {f.photos.length === 0 ? (
                        <div className="w-full h-full grid place-items-center text-center px-4">
                          <div>
                            <div className="w-10 h-10 rounded-full bg-white border border-line grid place-items-center text-ink-3 mx-auto mb-2">
                              <span className="text-lg" aria-hidden="true">＋</span>
                            </div>
                            <p className="text-[12px] text-ink-3">사진을 추가해보세요</p>
                          </div>
                        </div>
                      ) : f.photos.length === 2 ? (
                        // 2장 = 비교: 반반 분할
                        <div className="grid grid-cols-2 h-full gap-0.5">
                          {f.photos.slice(0, 2).map((p) => (
                            <div key={p.id} className="overflow-hidden">
                              <img
                                src={photoUrl(p.photoId, 400)}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        // N장: 첫 사진 크게
                        <img
                          src={photoUrl(f.photos[0].photoId, 400)}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}

                      {/* 사진 장수 뱃지 */}
                      <span className="absolute bottom-3 right-3 px-2 py-1 rounded-pill text-[11px] font-medium bg-black/40 text-white backdrop-blur-sm">
                        사진 {f.photos.length}장
                      </span>
                    </div>

                    {/* 정보 */}
                    <div className="p-5 pr-12">
                      <h2 className="font-display-ko font-medium text-[16px] text-ink truncate">
                        {f.name}
                      </h2>
                      {f.memo && (
                        <p className="text-[13px] text-ink-2 mt-1 truncate">
                          {f.memo}
                        </p>
                      )}
                      <p className="mt-3 text-[12px] text-ink-3">
                        사진 {f.photos.length}장 · 의견 {f.comments.length}개
                      </p>
                    </div>
                  </Link>
                  <FolderMenu
                    folder={f}
                    onEdit={openEdit}
                    onDelete={setDeletingFolder}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ═══ 모바일 하단 네비 ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-line flex items-center justify-around z-20">
        {SIDEBAR.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-[11px] ${item.active ? "text-ink font-medium" : "text-ink-3"}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>

      {createOpen && (
        <CreateCollaborationFolderModal
          onClose={() => setCreateOpen(false)}
          onCreate={createEmptyFolder}
        />
      )}

      {shareOpen && (
        <CollaborationShareModal
          folders={folders}
          shareCode={SHARE_CODE}
          expiresIn={SHARE_EXPIRES_IN}
          onClose={() => setShareOpen(false)}
        />
      )}

      {editingFolder && (
        <div className="fixed inset-0 z-[150] grid place-items-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingFolder(null)}
          />
          <div className="relative z-10 w-full max-w-[460px] bg-white rounded-2xl p-7">
            <h2 className="font-display-ko font-medium text-[20px] text-ink mb-1">
              협업 폴더 수정
            </h2>
            <p className="text-[13px] text-ink-2 mb-5">
              가족·지인에게 보이는 이름과 메모를 수정해요.
            </p>
            <div className="space-y-4">
              <label className="block">
                <span className="block text-[12px] font-medium text-ink-2 mb-1.5">
                  폴더 이름
                </span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-11 rounded-md border border-line px-3.5 text-[14px] text-ink outline-none focus:border-ink-3"
                />
              </label>
              <label className="block">
                <span className="block text-[12px] font-medium text-ink-2 mb-1.5">
                  메모
                </span>
                <textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-line px-3.5 py-3 text-[14px] text-ink outline-none resize-none focus:border-ink-3"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEditingFolder(null)}
                className="flex-1 h-11 rounded-pill border border-line text-sm font-medium text-ink-2 hover:bg-paper-deep transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={!editName.trim()}
                className="flex-1 h-11 rounded-pill bg-ink text-on-ink text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingFolder && (
        <div className="fixed inset-0 z-[150] grid place-items-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeletingFolder(null)}
          />
          <div className="relative z-10 w-full max-w-[380px] bg-white rounded-2xl p-7">
            <h2 className="font-display-ko font-medium text-[20px] text-ink mb-2">
              협업 폴더를 삭제할까요?
            </h2>
            <p className="text-[13px] text-ink-2 leading-relaxed mb-6">
              <span className="font-medium text-ink">{deletingFolder.name}</span>{" "}
              폴더가 목록에서 삭제됩니다. 이 작업은 되돌릴 수 없어요.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingFolder(null)}
                className="flex-1 h-11 rounded-pill border border-line text-sm font-medium text-ink-2 hover:bg-paper-deep transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 h-11 rounded-pill bg-danger text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

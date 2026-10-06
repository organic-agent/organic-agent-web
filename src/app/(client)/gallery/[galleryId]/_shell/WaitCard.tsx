/**
 * 대기 카드 — 작가가 아직 갤러리를 열지 않았을 때(DRAFT) 본문 자리
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/WaitCard.tsx
 *
 * 서버가 DRAFT 갤러리의 사진 · 폴더를 클라이언트에게 주지 않으므로 갤러리 정보만 보여 준다.
 * 열리면 GALLERY_OPENED 알림이 온다. 함께 볼 사람은 작가가 초대한다(하단 버튼 없음 — 2026-09-11 수민).
 * 개인 갤러리(personal)에는 작가가 없다 — 사진 목록 읽기가 거절(403)된 상황이라 "불러오지 못했어요"로만 말하고
 * 아래 정보 줄은 숨긴다(문구 점검 B09, 2026-10-06).
 */

import { ScheduleIcon } from "@/components/icons";
import { deadlineDateLabel, deadlineOffset } from "@/app/(studio)/_lib/galleryStatus";
import type { GalleryResponse } from "@/lib/api/galleries";

export function WaitCard({ gallery, memberCount, personal = false }: { gallery: GalleryResponse; memberCount: number | null; personal?: boolean }) {
  const deadline = deadlineDateLabel(gallery.selectionDeadline);
  const offset = deadlineOffset(gallery.selectionDeadline);
  if (personal) {
    return (
      <div className="grid flex-1 place-items-center px-6 py-8">
        <div className="flex w-full max-w-130 flex-col items-center gap-2 rounded-(--radius-16) border border-dashed border-border-default px-7 py-11 text-center">
          <span className="mb-1 grid size-14 place-items-center rounded-full bg-brand-secondary-background text-brand-secondary-default">
            <ScheduleIcon size={28} />
          </span>
          <h3 className="type-title-s text-contents-light-bgd-default">사진을 불러오지 못했어요</h3>
          <p className="type-content-s leading-relaxed text-contents-light-bgd-sub">잠시 뒤 화면을 새로 고쳐 주세요</p>
        </div>
      </div>
    );
  }
  return (
    <div className="grid flex-1 place-items-center px-6 py-8">
      <div className="flex w-full max-w-130 flex-col items-center gap-2 rounded-(--radius-16) border border-dashed border-border-default px-7 py-11 text-center">
        <span className="mb-1 grid size-14 place-items-center rounded-full bg-brand-secondary-background text-brand-secondary-default">
          <ScheduleIcon size={28} />
        </span>
        <h3 className="type-title-s text-contents-light-bgd-default">작가가 사진을 준비하고 있어요</h3>
        <p className="type-content-s leading-relaxed text-contents-light-bgd-sub">
          사진을 올리고 폴더를 정리하는 중이에요.
          <br />
          준비가 끝나면 알림으로 알려 드릴게요.
        </p>
        <dl className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 type-content-xs text-contents-light-bgd-weakness">
          <div className="flex gap-1.5">
            <dt>선택 마감</dt>
            <dd className="font-semibold text-contents-light-bgd-default">
              {deadline ? `${deadline}${offset !== null && offset < 0 ? ` (D-${-offset})` : ""}` : "기한 없음"}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt>선택 장수</dt>
            <dd className="font-semibold text-contents-light-bgd-default">
              {gallery.maxSelectablePhotoCount !== null ? `${gallery.maxSelectablePhotoCount}장` : "제한 없음"}
            </dd>
          </div>
          {memberCount !== null && (
            <div className="flex gap-1.5">
              <dt>함께 보는 사람</dt>
              <dd className="font-semibold text-contents-light-bgd-default">{memberCount} / 2</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

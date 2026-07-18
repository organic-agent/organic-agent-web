import { ModalFrame } from "@/components/ui/ModalFrame";
import { photoUrl, type CollabPhoto } from "@/lib/couple";

type Props = {
  photos: CollabPhoto[];
  selectedPhotoIds: number[];
  onTogglePhoto: (photoId: number) => void;
  onCreate: () => void;
  onClose: () => void;
};

export function VoteCreateModal({
  photos,
  selectedPhotoIds,
  onTogglePhoto,
  onCreate,
  onClose,
}: Props) {
  return (
    <ModalFrame
      onClose={onClose}
      title="투표 만들기"
      desc="비교할 사진 2장을 직접 선택해 가족·지인에게 투표를 요청해요."
      maxWidthClassName="max-w-[640px]"
    >
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 mb-6">
          {photos.map((photo) => {
            const order = selectedPhotoIds.indexOf(photo.id);
            const selected = order >= 0;

            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => onTogglePhoto(photo.id)}
                className={`relative aspect-[3/4] rounded-md overflow-hidden bg-paper-deep transition-all ${
                  selected
                    ? "ring-2 ring-inset ring-accent"
                    : "ring-1 ring-inset ring-line hover:ring-ink-3"
                }`}
              >
                <img
                  src={photoUrl(photo.photoId, 240)}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {selected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-white grid place-items-center text-[10px] font-bold">
                    {order + 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4 mb-5">
          <p className="text-[12px] text-ink-3">
            {selectedPhotoIds.length} / 2장 선택
          </p>
          {selectedPhotoIds.length >= 2 && (
            <p className="text-[12px] text-accent-press">2장을 선택했어요.</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-pill border border-line text-sm font-medium text-ink-2 hover:bg-paper-deep transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={selectedPhotoIds.length !== 2}
            className="flex-1 h-11 rounded-pill bg-ink text-on-ink text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            투표 링크 만들기
          </button>
        </div>
    </ModalFrame>
  );
}

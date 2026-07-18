import {
  photoUrl,
  type CollabComment,
  type CollabPhoto,
} from "@/lib/couple";

type Props = {
  photos: CollabPhoto[];
  comments: CollabComment[];
  activePhotoId: number | "all";
  onActivePhotoChange: (photoId: number | "all") => void;
};

const EMOJIS = [
  { key: "good", label: "좋아요", emoji: "😍", field: "good" as const },
  { key: "soso", label: "애매해요", emoji: "🙂", field: "soso" as const },
  { key: "sad", label: "별로예요", emoji: "😕", field: "sad" as const },
];

export function CollaborationPhotoGrid({
  photos,
  comments,
  activePhotoId,
  onActivePhotoChange,
}: Props) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-medium text-ink">사진별 의견</h2>
        <button
          type="button"
          onClick={() => onActivePhotoChange("all")}
          className={`h-8 px-3 rounded-pill text-[12px] font-medium transition-colors ${
            activePhotoId === "all"
              ? "bg-ink text-on-ink"
              : "border border-line text-ink-2 hover:border-ink-3"
          }`}
        >
          전체 의견
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-5">
        {photos.map((photo) => {
          const active = activePhotoId === photo.id;
          const commentCount = comments.filter(
            (comment) => comment.photoId === photo.id,
          ).length;

          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => onActivePhotoChange(photo.id)}
              className={`group text-left rounded-lg border overflow-hidden bg-white transition-all ${
                active
                  ? "border-ink shadow-md"
                  : "border-line hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              <div className="relative aspect-[4/3] bg-paper-deep overflow-hidden">
                <img
                  src={photoUrl(photo.photoId, 700)}
                  alt={`사진 ${photo.id}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute bottom-2.5 left-2.5 font-mono text-[9px] text-white/90 bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-sm">
                  #{String(photo.id).padStart(3, "0")}
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {EMOJIS.map((emoji) => (
                    <div
                      key={emoji.key}
                      className="rounded-md bg-paper px-2 py-2 text-center"
                    >
                      <div className="text-[16px] leading-none">
                        {emoji.emoji}
                      </div>
                      <p className="mt-1 text-[10px] text-ink-3">
                        {emoji.label}
                      </p>
                      <p className="mt-0.5 text-[13px] font-medium text-ink">
                        {photo[emoji.field]}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[12px] text-ink-3">
                  사진 의견 {commentCount}개
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

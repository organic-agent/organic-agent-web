/**
 * 클라이언트 브라우저 기억 — 우리끼리 메모 · 사진 열람 횟수 (서버 API가 없어 이 기기에만)
 * 위치: src/app/(client)/gallery/[galleryId]/_shell/clientMemory.ts
 *
 * 메모(sel.memo.{galleryId}): 사진 id → 문장. 작가에게 보이지 않아야 해서(2026-09-12 결정) 서버 "내부 사진 댓글"의
 * 열람 범위를 확인하기 전까지 브라우저에만 둔다 — 신랑 · 신부가 다른 기기면 서로 안 보인다(노션 ② 미결).
 * 열람(sel.viewed.{galleryId}): 사진 id → 싱글뷰로 연 횟수. 공유는 서버 API가 생기면(⑥ 갭 11).
 * reviewMemory와 같은 구독 방식(useSyncExternalStore) — raw 문자열을 읽고 바뀔 때만 파싱한다.
 */

export type RecordStore<T> = {
  readRaw: (galleryId: number) => string;
  parse: (raw: string) => Record<string, T>;
  subscribe: (onChange: () => void) => () => void;
  write: (galleryId: number, next: Record<string, T>) => void;
};

export function createRecordStore<T>(prefix: string, isValue: (v: unknown) => v is T): RecordStore<T> {
  const changeEvent = `${prefix}.change`;
  const keyOf = (galleryId: number) => `${prefix}.${galleryId}`;
  return {
    readRaw(galleryId) {
      try {
        return window.localStorage.getItem(keyOf(galleryId)) ?? "";
      } catch {
        return "";
      }
    },
    parse(raw) {
      if (!raw) return {};
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        const out: Record<string, T> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) if (isValue(v)) out[k] = v;
        return out;
      } catch {
        return {};
      }
    },
    subscribe(onChange) {
      window.addEventListener(changeEvent, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(changeEvent, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    write(galleryId, next) {
      try {
        if (Object.keys(next).length === 0) window.localStorage.removeItem(keyOf(galleryId));
        else window.localStorage.setItem(keyOf(galleryId), JSON.stringify(next));
      } catch {
        // 저장소 불가 — 이번 화면에서만
      }
      window.dispatchEvent(new Event(changeEvent));
    },
  };
}

export const memoStore = createRecordStore<string>("sel.memo", (v): v is string => typeof v === "string");
export const viewedStore = createRecordStore<number>("sel.viewed", (v): v is number => typeof v === "number");

export function writeMemo(galleryId: number, photoId: number, text: string) {
  const all = memoStore.parse(memoStore.readRaw(galleryId));
  if (text.trim()) all[String(photoId)] = text;
  else delete all[String(photoId)];
  memoStore.write(galleryId, all);
}

/** 싱글뷰로 열 때마다 1 — 같은 사진을 연속으로 넘겨 봐도 한 번으로 친다(호출 쪽에서 판단) */
export function countView(galleryId: number, photoId: number) {
  const all = viewedStore.parse(viewedStore.readRaw(galleryId));
  all[String(photoId)] = (all[String(photoId)] ?? 0) + 1;
  viewedStore.write(galleryId, all);
}

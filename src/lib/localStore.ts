/**
 * localStorage ↔ React 동기화 헬퍼
 * 위치: src/lib/localStore.ts
 *
 * createLocalStore(key, seed)로 저장소를 만들어 get/set/subscribe/getServerSnapshot을 제공한다.
 */

export type LocalStore<T> = {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
  getServerSnapshot: () => T;
};

/**
 * 왜 useSyncExternalStore 방식인가:
 *  - useState(() => localStorage 읽기)는 서버/클라이언트 렌더가 달라져 하이드레이션 불일치가 난다.
 *  - useState([]) + useEffect(setState)는 하이드레이션은 안전하지만 ESLint 규칙
 *    (react-hooks/set-state-in-effect)에 걸린다.
 *  - useSyncExternalStore는 "외부 저장소 ↔ 화면 동기화"용 훅이라 위 두 문제를 모두 해결한다.
 *
 * 주의: get은 값이 안 바뀌었으면 같은 참조를 돌려줘야 한다(매번 JSON.parse로 새 객체를
 *      만들면 무한 리렌더). 그래서 raw 문자열을 캐시하고 실제로 달라졌을 때만 다시 파싱한다.
 */
export function createLocalStore<T>(key: string, seed: T): LocalStore<T> {
  let cachedRaw: string | null | undefined; // undefined = 아직 한 번도 안 읽음
  let cachedValue: T = seed;
  const listeners = new Set<() => void>();

  function get(): T {
    if (typeof window === "undefined") return seed;
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return seed;
    }
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    if (raw === null) {
      cachedValue = seed;
    } else {
      try {
        cachedValue = JSON.parse(raw) as T;
      } catch {
        cachedValue = seed;
      }
    }
    return cachedValue;
  }

  function set(value: T) {
    cachedValue = value;
    try {
      cachedRaw = JSON.stringify(value);
      localStorage.setItem(key, cachedRaw);
    } catch {
      /* 무시 */
    }
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { get, set, subscribe, getServerSnapshot: () => seed };
}

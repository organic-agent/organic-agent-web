/**
 * CRC32C(Castagnoli) — S3 PUT의 `x-amz-checksum-crc32c` 헤더 값
 * 위치: src/lib/upload/crc32c.ts
 *
 * 서버가 발급하는 업로드 URL은 이 헤더를 서명에 포함한다. 프론트가 올리는 바이트에서
 * 직접 계산해 붙여야 하고, S3가 받은 바이트로 다시 계산해 다르면 거절한다(전송 중 깨진
 * 파일이 임베더까지 가지 않는다). 워커와 테스트가 함께 쓰므로 DOM에 기대지 않는다.
 *
 * 테이블 방식 순수 JS. 4KB 테이블 하나로 20MB/s 이상이라 장당(0.3MB) 수십 ms 안이다.
 */

const POLYNOMIAL = 0x82f63b78;

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1)
      c = c & 1 ? POLYNOMIAL ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** 바이트 배열의 CRC32C. 이어서 계산하려면 앞 결과를 `seed`로 준다 */
export function crc32c(bytes: Uint8Array, seed = 0): number {
  let crc = (seed ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i += 1)
    crc = TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** S3 헤더 형식 — 빅엔디안 4바이트를 base64로 */
export function crc32cToBase64(value: number): string {
  const bytes = new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
  if (typeof btoa === "function")
    return btoa(String.fromCharCode(...bytes));
  return Buffer.from(bytes).toString("base64");
}

/** Blob 전체의 CRC32C를 헤더 값(base64)으로. 한 번에 읽는다 — 상한이 20MB라 충분하다 */
export async function crc32cOfBlob(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return crc32cToBase64(crc32c(bytes));
}

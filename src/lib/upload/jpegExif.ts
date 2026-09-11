/**
 * JPEG 바이트를 디코딩하지 않고 다루는 작은 도구들 — 브라우저 리사이즈 워커가 쓴다
 * 위치: src/lib/upload/jpegExif.ts
 *
 * 왜 필요한가 — 캔버스로 다시 인코딩한 JPEG에는 EXIF가 없다. 촬영 시각·카메라·조리개는
 * embedder(Lambda)가 S3의 파일에서 읽어 photos 컬럼을 채우므로, 줄여서 올리면 그 정보가
 * 통째로 사라진다. 원본의 APP1(Exif) 세그먼트를 잘라 새 파일에 그대로 붙이면 embedder는
 * 아무것도 모른 채 지금처럼 읽는다. 서버 API도 바뀌지 않는다.
 *
 * JPEG는 `FF xx` 마커 + 2바이트 길이의 세그먼트가 이어지는 단순한 구조라 파서가 짧다.
 * SOI(FFD8) 뒤에 APPn·DQT·DHT 같은 헤더 세그먼트가 오고, SOFn(프레임 헤더, 크기가 여기 있다)을
 * 지나 SOS(FFDA)부터 압축 데이터다. 우리는 SOF까지만 읽으면 된다 — EXIF는 항상 그 앞에 있다.
 */

export interface JpegHeader {
  /** 파일에 적힌 크기. Orientation 회전 전이라 세로 사진도 가로로 적혀 있을 수 있다. */
  width: number;
  height: number;
  /** APP1(Exif) 세그먼트 통째(FFE1 마커 + 길이 + 본문). 없으면 null. */
  exif: Uint8Array | null;
}

/** 파싱을 어디까지 마쳤는지. `truncated`면 더 긴 조각을 다시 넣어야 한다. */
export type JpegHeaderResult =
  | { kind: "ok"; header: JpegHeader }
  | { kind: "truncated" }
  | { kind: "invalid" };

const SOI = [0xff, 0xd8] as const;
const MARKER_SOS = 0xda;
const MARKER_EOI = 0xd9;
const MARKER_APP0 = 0xe0;
const MARKER_APP1 = 0xe1;
/** SOF0~SOF15 중 실제 프레임 헤더. C4(DHT)·C8(JPG 확장)·CC(DAC)는 제외. */
const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
/** APP1 본문의 앞 6바이트 "Exif\0\0". 같은 APP1이라도 XMP는 이 서명이 없다. */
const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] as const;
/** JPEG 세그먼트 헤더에서 TIFF 헤더까지: FFE1(2) + 길이(2) + "Exif\0\0"(6). */
const TIFF_OFFSET_IN_SEGMENT = 10;
const TAG_ORIENTATION = 0x0112;

/**
 * 파일 앞부분에서 크기와 EXIF 세그먼트를 읽는다.
 *
 * SOF 마커를 만나면 끝이다. 그 전에 조각이 끝나면 `truncated`를 돌려주니, 호출부는 더 긴
 * 조각(결국은 파일 전체)으로 다시 부른다. SOF 없이 SOS·EOI에 닿거나 마커 정렬이 깨지면 `invalid`.
 */
export function readJpegHeader(bytes: Uint8Array): JpegHeaderResult {
  if (bytes.length < 4 || bytes[0] !== SOI[0] || bytes[1] !== SOI[1])
    return { kind: "invalid" };

  let exif: Uint8Array | null = null;
  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return { kind: "invalid" };
    const marker = bytes[offset + 1];
    // FF 패딩은 건너뛴다.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === MARKER_SOS || marker === MARKER_EOI)
      return { kind: "invalid" };

    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) return { kind: "invalid" };
    const end = offset + 2 + length;
    if (end > bytes.length) return { kind: "truncated" };

    if (
      marker === MARKER_APP1 &&
      exif === null &&
      hasExifSignature(bytes, offset + 4)
    ) {
      exif = bytes.slice(offset, end);
    }

    if (SOF_MARKERS.has(marker)) {
      // 세그먼트 본문: 정밀도(1) · 높이(2) · 너비(2) · ...
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      if (width === 0 || height === 0) return { kind: "invalid" };
      return { kind: "ok", header: { width, height, exif } };
    }

    offset = end;
  }

  return { kind: "truncated" };
}

function hasExifSignature(bytes: Uint8Array, at: number): boolean {
  return EXIF_SIGNATURE.every((byte, index) => bytes[at + index] === byte);
}

/**
 * Orientation 태그를 1(바로 섬)로 바꾼 복사본을 돌려준다.
 *
 * 리사이즈할 때 회전을 픽셀에 굽고 나면 원본의 Orientation(6·8 등)은 거짓이 된다. 그대로 두면
 * embedder의 exif_transpose가 이미 선 사진을 한 번 더 돌린다. 태그가 없으면 그대로 돌려준다 —
 * 태그가 없는 것과 1은 같은 뜻이다.
 *
 * TIFF 구조: 바이트 순서(II/MM, 2) · 매직 42(2) · IFD0 오프셋(4). IFD는 엔트리 수(2) 뒤에
 * 12바이트 엔트리 — 태그(2) · 타입(2) · 개수(4) · 값/오프셋(4). Orientation은 SHORT 하나라
 * 값 칸의 앞 2바이트에 바로 들어 있다(왼쪽 정렬, 엔디안과 무관하게 e+8).
 */
export function withUprightOrientation(segment: Uint8Array): Uint8Array {
  const out = segment.slice();
  const tiff = TIFF_OFFSET_IN_SEGMENT;
  if (out.length < tiff + 8) return out;

  const littleEndian = out[tiff] === 0x49 && out[tiff + 1] === 0x49;
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  const ifd0 = tiff + view.getUint32(tiff + 4, littleEndian);
  if (ifd0 + 2 > out.length) return out;

  const count = view.getUint16(ifd0, littleEndian);
  for (let index = 0; index < count; index += 1) {
    const entry = ifd0 + 2 + index * 12;
    if (entry + 12 > out.length) break;
    if (view.getUint16(entry, littleEndian) === TAG_ORIENTATION) {
      view.setUint16(entry + 8, 1, littleEndian);
      break;
    }
  }
  return out;
}

/**
 * EXIF 세그먼트를 새 JPEG에 끼워 넣는다.
 *
 * 자리는 SOI 바로 뒤, 단 APP0(JFIF)가 먼저 있으면 그 뒤다. JFIF 규격은 APP0가 SOI 바로 뒤여야
 * 한다고 하고 Exif 규격은 APP1이 그 자리라고 해서 서로 어긋나는데, 실제 파일은 둘 다 흔하고
 * Pillow·브라우저 모두 어느 쪽이든 읽는다. 캔버스 출력은 보통 APP0로 시작하니 그 뒤에 둔다.
 */
export function spliceExif(jpeg: Uint8Array, exif: Uint8Array): Uint8Array {
  let insertAt = 2;
  if (jpeg.length >= 6 && jpeg[2] === 0xff && jpeg[3] === MARKER_APP0) {
    const length = (jpeg[4] << 8) | jpeg[5];
    insertAt = Math.min(jpeg.length, 4 + length);
  }
  const out = new Uint8Array(jpeg.length + exif.length);
  out.set(jpeg.subarray(0, insertAt), 0);
  out.set(exif, insertAt);
  out.set(jpeg.subarray(insertAt), insertAt + exif.length);
  return out;
}

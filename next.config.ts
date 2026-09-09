import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // 구 주소 → 새 주소. 옛 북마크·전달된 링크용 임시 장치 — 진입 흐름(C1)이 끝나면 지운다.
    return [
      { source: "/galleries", destination: "/studio", permanent: false },
      {
        source: "/galleries/:galleryId",
        destination: "/studio/gallery/:galleryId",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

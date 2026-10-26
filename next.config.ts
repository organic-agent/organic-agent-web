import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 체험 페이지(이슈 144): /demo는 실제 갤러리 화면(/demo/[galleryId])을 체험 갤러리 번호로 연다. 주소는 /demo 그대로
  async rewrites() {
    return [{ source: "/demo", destination: "/demo/999" }];
  },
};

export default nextConfig;

/**
 * 404 페이지 — 존재하지 않는 주소로 접근했을 때
 * 위치: src/app/not-found.tsx
 *
 * 게스트가 만료·오타 링크로 들어오는 경우가 많아 브랜드가 보이는 안내를 준다.
 */

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background-default-main px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandLogo size={40} className="text-contents-light-bgd-default" />
        <h1 className="type-title-xl text-contents-light-bgd-default">
          페이지를 찾을 수 없어요
        </h1>
        <p className="type-content-m text-contents-light-bgd-sub">
          주소가 잘못됐거나, 삭제됐거나, 만료된 링크일 수 있어요.
        </p>
        <Button href="/" className="mt-2">
          홈으로 가기
        </Button>
      </div>
    </main>
  );
}

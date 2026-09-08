"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginModal } from "@/components/LoginModal";
import { ArrowRightIcon } from "@/components/icons";

export function LandingNav() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginIntent, setLoginIntent] = useState<"couple" | "studio">("couple");

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-100 bg-background-default-main border-b border-divider-default">
        <div className="max-w-wrap mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-[10px]"
            aria-label="Easy Select 홈"
          >
            <BrandLogo size={32} className="text-contents-light-bgd-default shrink-0" />
            <b className="type-brand-wordmark text-contents-light-bgd-default">Easy Select</b>
          </Link>

          {/* Nav buttons */}
          <nav className="flex items-center gap-2">
            <Button
              kind="ghost"
              onClick={() => {
                setLoginIntent("couple");
                setLoginOpen(true);
              }}
            >
              로그인
            </Button>
            <Button
              icon={<ArrowRightIcon />}
              onClick={() => {
                setLoginIntent("studio");
                setLoginOpen(true);
              }}
            >
              스튜디오 시작하기
            </Button>
          </nav>
        </div>
      </header>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        intent={loginIntent}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginModal } from "@/components/LoginModal";

function ArrowIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function LandingNav() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginIntent, setLoginIntent] = useState<"couple" | "studio">("couple");

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/88 backdrop-blur-[16px] backdrop-saturate-[1.2] border-b border-line">
        <div className="max-w-wrap mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-[10px]"
            aria-label="Wedding Easy Select 홈"
          >
            <BrandLogo size={30} className="text-ink shrink-0" />
            <span className="flex flex-col leading-[1.15]">
              <b className="font-display-en font-semibold text-[17px] tracking-[0.01em] text-ink">
                Wedding Easy Select
              </b>
              <small className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-3">
                Making Your Wedding Simple
              </small>
            </span>
          </Link>

          {/* Nav buttons */}
          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoginIntent("couple");
                setLoginOpen(true);
              }}
            >
              로그인
            </Button>
            <Button
              variant="dark"
              size="sm"
              icon={<ArrowIcon />}
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

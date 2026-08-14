"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!EMAIL_RE.test(v)) {
      setError("올바른 이메일 주소를 입력해 주세요");
      return;
    }
    setError("");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="type-body-medium text-fg-neutral flex items-center justify-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-fg-positive"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
        합류 완료! 초대장이 준비되면 가장 먼저 알려드릴게요.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <form
        className="flex items-center justify-between gap-2 w-full max-w-120 h-12 border border-stroke-neutral-muted rounded-(--pill) pl-5 pr-1 bg-bg-layer-default transition-colors duration-fast ease-out focus-within:border-stroke-neutral-weak
                   max-[480px]:h-auto max-[480px]:flex-col max-[480px]:rounded-(--radius-12) max-[480px]:p-3"
        onSubmit={handleSubmit}
        noValidate
      >
        <label htmlFor="email" className="sr-only">
          이메일 주소
        </label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="이메일 주소를 입력하세요"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-0 bg-transparent border-none outline-none type-body-medium text-fg-neutral placeholder:text-fg-neutral-muted
                     max-[480px]:w-full max-[480px]:py-2.5 max-[480px]:text-center"
        />
        <Button type="submit" className="max-[480px]:w-full">
          합류하기
        </Button>
      </form>

      <p
        className={`type-body-small ${error ? "text-fg-critical" : "text-fg-neutral-muted"}`}
      >
        {error ||
          "오직 출시 소식 전달에만 써요 · 다른 목적으로 사용하지 않습니다"}
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";

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
      <p className="mt-3.5 text-sm text-ink flex items-center justify-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D4636B"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
        합류 완료! 초대장이 준비되면 가장 먼저 알려드릴게요.
      </p>
    );
  }

  return (
    <>
      <form
        className="flex gap-2 max-w-[440px] mx-auto border border-line-strong rounded-pill p-[5px] pl-1.5 bg-paper transition-colors duration-fast ease-out focus-within:border-ink-3
                   max-[480px]:flex-col max-[480px]:rounded-md max-[480px]:p-3"
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
          className="flex-1 bg-transparent border-none outline-none text-ink font-sans text-sm px-3 min-w-0
                     placeholder:text-ink-3
                     max-[480px]:px-1.5 max-[480px]:py-2.5 max-[480px]:text-center"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center h-10 px-5 rounded-pill text-[13px] font-medium bg-ink text-on-ink whitespace-nowrap cursor-pointer border-none transition-all duration-fast ease-out hover:-translate-y-px hover:bg-[#333] hover:shadow-[0_4px_14px_rgba(0,0,0,0.15)] active:translate-y-px
                     max-[480px]:w-full"
        >
          합류하기
        </button>
      </form>

      <p
        className={`mt-3.5 text-xs tracking-[0.02em] ${error ? "text-accent" : "text-ink-3"}`}
      >
        {error ||
          "오직 출시 소식 전달에만 써요 · 다른 목적으로 사용하지 않습니다"}
      </p>
    </>
  );
}

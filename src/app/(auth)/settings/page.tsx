"use client";

/**
 * 설정 — /settings (계정 · 스튜디오별 · 개인 갤러리)
 * 위치: src/app/(auth)/settings/page.tsx
 *
 * 주소 쿼리 studio(workspaceId)·tab으로 어느 화면인지 정한다. 초대 모달의 "멤버 관리"가
 * ?studio={id}&tab=members 로 바로 들어온다. useSearchParams는 정적 페이지에서 Suspense 경계가 필요하다.
 */

import { Suspense } from "react";
import { SettingsPage } from "./_components/SettingsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}

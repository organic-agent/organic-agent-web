"use client";

import { GallerySelectionStatusTab } from "../_components/GallerySelectionStatusTab";
import { GalleryWorkspaceContentShell } from "../_components/GalleryWorkspaceContentShell";

const INVITED = [
  { name: "신부 · 서연", status: "수락", role: "bride" },
  { name: "신랑 · 민준", status: "수락", role: "groom" },
];

export default function GallerySelectionStatusPage() {
  return (
    <GalleryWorkspaceContentShell>
      <GallerySelectionStatusTab invited={INVITED} />
    </GalleryWorkspaceContentShell>
  );
}

import { api } from "@/lib/api/client";

export type WorkspaceResponse = {
  id: number;
  type: "PERSONAL" | "STUDIO";
  name: string;
  role: "OWNER" | "MEMBER";
};

export function listWorkspaces(): Promise<WorkspaceResponse[]> {
  return api("/api/v1/workspaces");
}

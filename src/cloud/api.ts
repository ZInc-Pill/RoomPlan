import type { PlanDocument } from "../utils/documentHistory";
import { parseProject } from "../utils/projectFile";
import { requireCloud } from "./client";
import type { Change } from "./patches";
export type Role = "owner" | "editor" | "viewer";
export type Project = {
  id: string;
  owner_id: string;
  title: string;
  revision: number;
  archived: boolean;
  updated_at: string;
  document: PlanDocument;
};
export type ProjectCard = Omit<Project, "document">;
export function check<T>({ data, error }: { data: T; error: any }): T {
  if (error) throw new Error(error.message);
  return data;
}
export const validateProject = (p: any): Project => ({
  ...p,
  document: parseProject(JSON.stringify(p.document)),
});
export async function loadProject(id: string) {
  return validateProject(
    check(
      await requireCloud()
        .from("rp_projects")
        .select("*")
        .eq("id", id)
        .single(),
    ),
  );
}
export async function projectRole(
  project: Project,
  userId: string,
): Promise<Role> {
  if (project.owner_id === userId) return "owner";
  const member = check(
    await requireCloud()
      .from("rp_members")
      .select("role")
      .eq("project_id", project.id)
      .eq("user_id", userId)
      .single(),
  );
  return member.role;
}
export async function saveChanges(id: string, changes: Change[]) {
  return validateProject(
    check(
      await requireCloud().rpc("rp_save_changes", {
        p_project: id,
        p_changes: changes,
      }),
    ),
  );
}
export async function createProject(
  title: string,
  document?: PlanDocument,
): Promise<string> {
  return check(
    await requireCloud().rpc("rp_create_project", {
      p_title: title,
      ...(document ? { p_document: document } : {}),
    }),
  );
}
export async function listProjects(offset = 0): Promise<ProjectCard[]> {
  return check(
    await requireCloud()
      .from("rp_projects")
      .select("id,owner_id,title,revision,archived,updated_at")
      .order("updated_at", { ascending: false })
      .range(offset, offset + 49),
  );
}
export const updateProject = async (
  p: ProjectCard,
  title: string,
  archived: boolean,
) =>
  check(
    await requireCloud().rpc("rp_update_project", {
      p_project: p.id,
      p_title: title,
      p_archived: archived,
    }),
  );
export function downloadDocument(
  document: PlanDocument,
  title = "RoomPlan recovery",
) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ version: 1, document }, null, 2)], {
      type: "application/json",
    }),
  );
  const a = window.document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9 -]/gi, "").slice(0, 80)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

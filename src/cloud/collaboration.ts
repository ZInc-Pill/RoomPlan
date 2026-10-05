import type { Point } from "../types";
export type CollaboratorCursor = Point & { view: "2d" | "3d" };
export type Collaborator = { id: string; name: string; cursor: CollaboratorCursor | null };
export const cursorColor = (id: string) => {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return ["#7c3aed", "#0284c7", "#db2777", "#059669", "#d97706"][Math.abs(hash) % 5];
};
export function safePeers(value: unknown): Collaborator[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap(p => {
    if (!p || typeof p.id !== "string" || typeof p.name !== "string") return [];
    const c = p.cursor;
    const valid = c && ["2d", "3d"].includes(c.view) && Number.isFinite(c.x) && Number.isFinite(c.y) && Math.abs(c.x) <= 1e6 && Math.abs(c.y) <= 1e6;
    return [{ id: p.id.slice(0, 64), name: p.name.slice(0, 32), cursor: valid ? c : null }];
  });
}
export function guestToken(url: string) {
  return new URLSearchParams(new URL(url).hash.slice(1)).get("guest");
}
export function guestHref(token: string) {
  return `${location.origin}${location.pathname}#guest=${encodeURIComponent(token)}`;
}
// One in-flight request. Movement sends the latest position, never a queue of old positions.
export class CollaborationLoop {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private active = false;
  private moved = 0;
  private nextRequest = 0;
  cursor: CollaboratorCursor | null = null;
  constructor(private request: (cursor: CollaboratorCursor | null) => Promise<void>, private visible: () => boolean = () => !document.hidden) {}
  point(cursor: CollaboratorCursor | null) {
    this.cursor = cursor;
    this.moved = Date.now();
    this.wake();
  }
  wake() {
    if (this.stopped || this.active) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), Math.max(0, this.nextRequest - Date.now()));
  }
  async tick() {
    if (this.stopped || this.active) return;
    this.active = true;
    this.nextRequest = Date.now() + 200;
    try { if (this.visible()) await this.request(this.cursor); }
    finally {
      this.active = false;
      if (!this.stopped) this.timer = setTimeout(() => void this.tick(), Date.now() - this.moved < 1200 ? 200 : 500);
    }
  }
  stop() { this.stopped = true; clearTimeout(this.timer); }
}

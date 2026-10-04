export type MobileGestureTarget = 'object' | 'empty' | 'other';
/** Local object drags bypass the global pointer-history transaction entirely. */
export class MobileDragHistoryGate {
  private ignored = new Set<number>();
  down(id: number, mobileObject: boolean) {
    if (!mobileObject && !this.ignored.size) return false;
    this.ignored.add(id);
    return true;
  }
  end(id: number) { return this.ignored.delete(id); }
  clear() { this.ignored.clear(); }
}
/** Ownership lasts until all fingers lift; ignored fingers cannot become a new gesture. */
export class MobileGestureOwnership {
  private pointers = new Map<number, MobileGestureTarget | 'ignored'>();
  private family: MobileGestureTarget | null = null;
  owner: number | null = null;
  down(id: number, target: MobileGestureTarget) {
    if (!this.pointers.size) {
      this.family = target;
      if (target === 'object') this.owner = id;
    }
    const accepted = this.family === 'empty' && target === 'empty'
      ? 'empty' : this.pointers.size === 0 ? target : 'ignored';
    this.pointers.set(id, accepted);
    return accepted;
  }
  kind(id: number) { return this.pointers.get(id); }
  get objectGesture() { return this.family === 'object'; }
  up(id: number) {
    this.pointers.delete(id);
    if (this.owner === id) this.owner = null;
    if (!this.pointers.size) this.family = null;
  }
  clear() { this.pointers.clear(); this.family = null; this.owner = null; }
}

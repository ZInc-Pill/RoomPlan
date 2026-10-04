import type { PlanDocument } from "../utils/documentHistory";

export const collections = ["walls", "floors", "items", "comments"] as const;
export type Change = {
  collection: keyof PlanDocument;
  id: string;
  before: unknown | null;
  after: unknown | null;
};
const stable = (value: unknown): string =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((key) => [key, v[key]]),
        )
      : v,
  );
export const same = (a: unknown, b: unknown) => stable(a) === stable(b);
export function changesBetween(
  before: PlanDocument,
  after: PlanDocument,
): Change[] {
  return collections.flatMap((collection) => {
    const old = new Map<string, unknown>(
      before[collection].map((entity) => [entity.id, entity] as const),
    );
    const next = new Map<string, unknown>(
      after[collection].map((entity) => [entity.id, entity] as const),
    );
    return [...new Set([...old.keys(), ...next.keys()])].flatMap((id) => {
      const a = old.get(id) ?? null,
        b = next.get(id) ?? null;
      return same(a, b) ? [] : [{ collection, id, before: a, after: b }];
    });
  });
}
/** Atomic compare-and-set patch. Never overwrite a concurrently changed entity. */
export function applyChanges(
  document: PlanDocument,
  changes: Change[],
): PlanDocument {
  const result = structuredClone(document);
  for (const change of changes) {
    const list = result[change.collection] as { id: string }[];
    const index = list.findIndex((entity) => entity.id === change.id);
    const current = index < 0 ? null : list[index];
    if (same(current, change.after)) continue; // Retry after an acknowledged/unknown network outcome.
    if (!same(current, change.before))
      throw new Error(
        "Another collaborator changed the same object. Your edits are preserved locally.",
      );
    if (change.after === null) {
      if (index >= 0) list.splice(index, 1);
    } else if (index < 0) list.push(change.after as { id: string });
    else list[index] = change.after as { id: string };
  }
  return result;
}

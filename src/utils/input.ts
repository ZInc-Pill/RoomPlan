/**
 * Input and interaction utility helpers.
 * Shared across Canvas2D, useCanvasViewport, and App for consistent event checks.
 */

/**
 * Determines whether an event target is an interactive form or text editing element.
 * Used to prevent canvas shortcuts and spacebar pan from interfering with text input.
 */
export function isInteractiveElement(target: EventTarget | null): boolean {
  if (!target) return false;
  if (typeof HTMLElement !== 'undefined' && !(target instanceof HTMLElement)) return false;
  const el = target as { tagName?: string; isContentEditable?: boolean };
  const tagName = el.tagName?.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    Boolean(el.isContentEditable)
  );
}

/**
 * Determines whether a pointer event represents the primary pointer button (e.g. left click or touch).
 */
export function isPrimaryPointer(e: { button?: number; isPrimary?: boolean }): boolean {
  if (e.button !== undefined && e.button !== 0) return false;
  if (e.isPrimary !== undefined && !e.isPrimary) return false;
  return true;
}

/**
 * Extracts standard modifier keys from a keyboard or pointer event.
 */
export function getModifierState(e: KeyboardEvent | React.KeyboardEvent | MouseEvent | React.MouseEvent) {
  return {
    ctrlOrMeta: Boolean(e.ctrlKey || e.metaKey),
    shift: Boolean(e.shiftKey),
    alt: Boolean(e.altKey),
  };
}

// Helper utilities for color conversion and screenshots to avoid oklch parsing errors in html2canvas

function parseOklch(str: string): { l: number; c: number; h: number; a: number } | null {
  const m = str.match(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+%?))?\s*\)/i);
  if (!m) return null;
  const l = m[1].endsWith('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  const c = parseFloat(m[2]);
  const h = parseFloat(m[3]);
  const a = m[4] ? (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])) : 1;
  return { l, c, h, a };
}

function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  const hRad = (h * Math.PI) / 180;
  const a_ = c * Math.cos(hRad);
  const b_ = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r = +4.0767434070 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bVal = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const comp = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    return clamped <= 0.0031308
      ? Math.round(clamped * 12.92 * 255)
      : Math.round((1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255);
  };

  if (a < 1) {
    return `rgba(${comp(r)}, ${comp(g)}, ${comp(bVal)}, ${a})`;
  }
  return `rgb(${comp(r)}, ${comp(g)}, ${comp(bVal)})`;
}

export function sanitizeColorString(str: string): string {
  if (!str) return str;
  if (!str.includes('oklch') && !str.includes('color-mix')) return str;

  return str.replace(/(?:oklch|color-mix)\([^\)]+\)/gi, (match) => {
    if (typeof document !== 'undefined') {
      try {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#123456';
          ctx.fillStyle = match;
          if (
            ctx.fillStyle &&
            ctx.fillStyle !== '#123456' &&
            !ctx.fillStyle.includes('oklch') &&
            !ctx.fillStyle.includes('color-mix')
          ) {
            return ctx.fillStyle;
          }
        }
      } catch (e) {}
    }
    const parsed = parseOklch(match);
    if (parsed) {
      return oklchToRgb(parsed.l, parsed.c, parsed.h, parsed.a);
    }
    return 'rgb(0,0,0)';
  });
}

export function sanitizeClonedDocument(clonedDoc: Document, clonedElement: HTMLElement) {
  // 1. Sanitize all <style> tags in cloned document
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((tag) => {
    if (tag.textContent && (tag.textContent.includes('oklch') || tag.textContent.includes('color-mix'))) {
      tag.textContent = sanitizeColorString(tag.textContent);
    }
  });

  // 2. Sanitize element inline and computed styles
  const colorProps = [
    'color',
    'background-color',
    'border-color',
    'border-top-color',
    'border-bottom-color',
    'border-left-color',
    'border-right-color',
    'outline-color',
    'fill',
    'stroke',
    'box-shadow'
  ];

  const allElements = clonedElement.querySelectorAll('*');
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style) {
      for (let i = 0; i < htmlEl.style.length; i++) {
        const prop = htmlEl.style[i];
        const val = htmlEl.style.getPropertyValue(prop);
        if (val && (val.includes('oklch') || val.includes('color-mix'))) {
          htmlEl.style.setProperty(prop, sanitizeColorString(val), htmlEl.style.getPropertyPriority(prop));
        }
      }
    }

    try {
      const cs = window.getComputedStyle(htmlEl);
      for (const prop of colorProps) {
        const val = cs.getPropertyValue(prop);
        if (val && (val.includes('oklch') || val.includes('color-mix'))) {
          htmlEl.style.setProperty(prop, sanitizeColorString(val), 'important');
        }
      }
    } catch (e) {}
  });
}

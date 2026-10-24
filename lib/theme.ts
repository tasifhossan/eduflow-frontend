/**
 * Theme & WCAG AA Contrast Utility
 * Converts hex colors, evaluates contrast ratios, and auto-adjusts lightness
 * to guarantee WCAG AA (>= 4.5:1 for normal text) on primary brand elements.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  primaryDark: string;
  primaryRgb: string;
  contrastRatio: number;
  isAdjusted: boolean;
}

const HEX_REGEX = /^#([0-9A-Fa-f]{6})$/;

export function sanitizeHex(hex?: string | null, fallback = '#0ea5e9'): string {
  if (!hex || typeof hex !== 'string') return fallback;
  const trimmed = hex.trim();
  if (HEX_REGEX.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return fallback;
}

export function hexToRgb(hex: string): RGB {
  const sanitized = sanitizeHex(hex);
  const num = parseInt(sanitized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (c: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(c)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  if (sNorm === 0) {
    const val = Math.round(lNorm * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tAdj = t;
    if (tAdj < 0) tAdj += 1;
    if (tAdj > 1) tAdj -= 1;
    if (tAdj < 1 / 6) return p + (q - p) * 6 * tAdj;
    if (tAdj < 1 / 2) return q;
    if (tAdj < 2 / 3) return p + (q - p) * (2 / 3 - tAdj) * 6;
    return p;
  };

  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
  const p = 2 * lNorm - q;

  const r = hue2rgb(p, q, hNorm + 1 / 3);
  const g = hue2rgb(p, q, hNorm);
  const b = hue2rgb(p, q, hNorm - 1 / 3);

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Calculates relative luminance according to WCAG 2.1 specs
 */
export function getRelativeLuminance({ r, g, b }: RGB): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two colors (range: 1 to 21)
 */
export function getContrastRatio(c1: RGB, c2: RGB): number {
  const l1 = getRelativeLuminance(c1);
  const l2 = getRelativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE_RGB: RGB = { r: 255, g: 255, b: 255 };
const DARK_RGB: RGB = { r: 15, g: 23, b: 42 }; // #0f172a

/**
 * Ensures primary color meets WCAG AA (>= 4.5:1) against white text.
 * If contrast with white is insufficient, lowers lightness iteratively.
 */
export function enforceWcagAA(hexColor: string): {
  color: string;
  contrast: number;
  adjusted: boolean;
  foreground: string;
} {
  const rgb = hexToRgb(hexColor);
  const hsl = rgbToHsl(rgb);
  const whiteRatio = getContrastRatio(rgb, WHITE_RGB);
  const darkRatio = getContrastRatio(rgb, DARK_RGB);

  // If contrast with white is already >= 4.5:1
  if (whiteRatio >= 4.5) {
    return {
      color: hexColor.toLowerCase(),
      contrast: Number(whiteRatio.toFixed(2)),
      adjusted: false,
      foreground: '#ffffff',
    };
  }

  // If color is very light (e.g. yellow/cyan), dark text might be preferred
  if (darkRatio >= 7.0 && whiteRatio < 2.5) {
    return {
      color: hexColor.toLowerCase(),
      contrast: Number(darkRatio.toFixed(2)),
      adjusted: false,
      foreground: '#090d16',
    };
  }

  // Adjust lightness downwards until contrast with white >= 4.5:1
  let currentL = hsl.l;
  let adjustedRgb = rgb;
  let adjustedRatio = whiteRatio;

  while (currentL > 10 && adjustedRatio < 4.5) {
    currentL -= 2;
    adjustedRgb = hslToRgb({ ...hsl, l: currentL });
    adjustedRatio = getContrastRatio(adjustedRgb, WHITE_RGB);
  }

  const finalHex = rgbToHex(adjustedRgb);
  return {
    color: finalHex,
    contrast: Number(adjustedRatio.toFixed(2)),
    adjusted: true,
    foreground: '#ffffff',
  };
}

export function computeThemeTokens(primaryHex: string): ThemeColors {
  const sanitized = sanitizeHex(primaryHex);
  const { color, contrast, adjusted, foreground } = enforceWcagAA(sanitized);
  const rgb = hexToRgb(color);
  const hsl = rgbToHsl(rgb);

  // Hover variant: slightly darker or lighter
  const hoverHsl: HSL = {
    ...hsl,
    l: hsl.l > 20 ? Math.max(0, hsl.l - 8) : hsl.l + 10,
  };
  const hoverHex = rgbToHex(hslToRgb(hoverHsl));

  // Dark mode variant: slightly more vibrant
  const darkVariantHsl: HSL = {
    ...hsl,
    s: Math.min(100, hsl.s + 5),
    l: Math.min(85, Math.max(45, hsl.l + 5)),
  };
  const darkVariantHex = rgbToHex(hslToRgb(darkVariantHsl));

  return {
    primary: color,
    primaryHover: hoverHex,
    primaryForeground: foreground,
    primaryDark: darkVariantHex,
    primaryRgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    contrastRatio: contrast,
    isAdjusted: adjusted,
  };
}

/**
 * Generates runtime CSS string for <style id="center-theme"> injection
 */
export function generateThemeCss(primaryHex: string): string {
  const tokens = computeThemeTokens(primaryHex);
  return `
    :root {
      --primary: ${tokens.primary};
      --primary-foreground: ${tokens.primaryForeground};
      --primary-hover: ${tokens.primaryHover};
      --primary-rgb: ${tokens.primaryRgb};
      --ring: ${tokens.primary};
    }
    .dark {
      --primary: ${tokens.primaryDark};
      --primary-foreground: #ffffff;
      --primary-hover: ${tokens.primary};
      --ring: ${tokens.primaryDark};
    }
  `;
}

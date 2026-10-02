export function coverThemeToCssColor(
  coverThemeColor: string | null | undefined,
  alpha?: number,
): string | null {
  if (coverThemeColor == null || coverThemeColor === "") return null;
  const parts = coverThemeColor.split(",").map((s) => s.trim());
  if (parts.length !== 3) return null;
  const [r, g, b] = parts.map(Number);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  if (alpha !== undefined) {
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgb(${r},${g},${b})`;
}

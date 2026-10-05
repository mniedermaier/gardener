/** Joins class names, skipping falsy parts: cn("a", cond && "b", undefined). */
export function cn(...parts: Array<string | false | null | undefined | 0>): string {
  return parts.filter(Boolean).join(" ");
}

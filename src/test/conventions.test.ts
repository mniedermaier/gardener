/**
 * Ratchet for design-system conventions (docs/DESIGN_SYSTEM.md).
 *
 * All counts are at zero now; the baselines stay here so a new occurrence
 * fails the build with a pointer to the right primitive or helper.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const COMPONENTS = "src/components";

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return files(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

const sources = files(COMPONENTS).map((f) => ({ file: f, text: readFileSync(f, "utf8") }));
const isPrimitive = (f: string) => f.includes(`${join(COMPONENTS, "ui")}/`);

function count(pattern: RegExp, { skipPrimitives = false } = {}) {
  const hits: string[] = [];
  for (const { file, text } of sources) {
    if (skipPrimitives && isPrimitive(file)) continue;
    const n = text.match(pattern)?.length ?? 0;
    if (n) hits.push(`${file}: ${n}`);
  }
  const total = hits.reduce((sum, h) => sum + Number(h.split(": ")[1]), 0);
  return { total, hits };
}

const RULES: Array<{ name: string; pattern: RegExp; max: number; fix: string; skipPrimitives?: boolean }> = [
  { name: "toFixed() in components", pattern: /\.toFixed\(/g, max: 0, fix: "use useFormat() / lib/format.ts" },
  { name: "font size below 11px", pattern: /text-\[(?:[0-9]|10)(?:\.\d+)?px\]/g, max: 0, fix: "smallest size is text-xs (12px) or text-overline (11px)" },
  { name: "raw <select>", pattern: /<select\b/g, max: 0, fix: "use ui/Select", skipPrimitives: true },
  { name: "raw <textarea>", pattern: /<textarea\b/g, max: 0, fix: "use ui/Textarea", skipPrimitives: true },
  { name: "window.prompt/alert", pattern: /\b(?:window\.)?(?:prompt|alert)\(/g, max: 0, fix: "use Modal or toast" },
];

describe("design-system ratchet", () => {
  for (const rule of RULES) {
    it(`${rule.name}: at most ${rule.max} (${rule.fix})`, () => {
      const { total, hits } = count(rule.pattern, { skipPrimitives: rule.skipPrimitives });
      expect(total, `${rule.name} rose above the baseline — ${rule.fix}.\n${hits.join("\n")}`).toBeLessThanOrEqual(rule.max);
    });
  }

  it("primitives themselves contain none of these", () => {
    const offenders = sources
      .filter(({ file }) => isPrimitive(file))
      .filter(({ text }) => /\.toFixed\(|text-\[(?:[0-9]|10)px\]/.test(text))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});

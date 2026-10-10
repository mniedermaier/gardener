import { describe, expect, it } from "vitest";
import { bottomTabForPath } from "@/components/layout/navigation";

describe("bottomTabForPath", () => {
  it("lights the tab of the page's section", () => {
    expect(bottomTabForPath("/")).toBe("today");
    expect(bottomTabForPath("/weather")).toBe("today");
    expect(bottomTabForPath("/tasks")).toBe("tasks");
    expect(bottomTabForPath("/calendar")).toBe("tasks");
    expect(bottomTabForPath("/harvest")).toBe("harvest");
    expect(bottomTabForPath("/planner")).toBe("planner");
    expect(bottomTabForPath("/import")).toBe("planner");
  });

  it("lights \"Mehr\" for pages without a tab of their own", () => {
    for (const p of ["/plants", "/companions", "/livestock", "/livestock/a1", "/expenses", "/journal", "/settings", "/sufficiency"]) {
      expect(bottomTabForPath(p)).toBe("more");
    }
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_SOWING, sowingDraftOf, sowingFields } from "@/lib/customPlant";
import { familyOf } from "@/data/plantFamilies";

describe("custom plant sowing", () => {
  it("maps direct sowing to sowOutdoorsWeeks only", () => {
    expect(sowingFields({ ...DEFAULT_SOWING, mode: "direct", sowWeeks: -2 })).toEqual({ sowIndoorsWeeks: null, sowOutdoorsWeeks: -2, transplantWeeks: null });
  });

  it("maps indoor raising to sowIndoorsWeeks and transplantWeeks", () => {
    expect(sowingFields({ ...DEFAULT_SOWING, mode: "indoors", indoorsWeeks: -8, transplantWeeks: 1 })).toEqual({ sowIndoorsWeeks: -8, sowOutdoorsWeeks: null, transplantWeeks: 1 });
  });

  it("round-trips through the stored fields", () => {
    const s = { ...DEFAULT_SOWING, mode: "indoors" as const, indoorsWeeks: -4, transplantWeeks: 3 };
    expect(sowingDraftOf(sowingFields(s))).toEqual(s);
    expect(sowingDraftOf({ sowIndoorsWeeks: null, sowOutdoorsWeeks: 0, transplantWeeks: null }).mode).toBe("direct");
  });
});

describe("familyOf", () => {
  it("uses the catalogue first, then the custom family, then other", () => {
    expect(familyOf("tomato")).toBe("solanaceae");
    expect(familyOf("custom-ingwer-1", { family: "lamiaceae" })).toBe("lamiaceae");
    expect(familyOf("custom-x-1")).toBe("other");
  });
});

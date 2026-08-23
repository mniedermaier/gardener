import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { safeLocalStorage, onStorageFailure } from "@/lib/persistStorage";

function quotaError() {
  return new DOMException("exceeded", "QuotaExceededError");
}

describe("safeLocalStorage", () => {
  let setItem: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setItem = vi.spyOn(Storage.prototype, "setItem");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes through when there is room", () => {
    safeLocalStorage.setItem("k", "v");
    expect(setItem).toHaveBeenCalledWith("k", "v");
  });

  it("reports a quota failure instead of swallowing it", () => {
    const seen: string[] = [];
    const stop = onStorageFailure(({ kind }) => seen.push(kind));

    setItem.mockImplementation(() => {
      throw quotaError();
    });
    // Must not throw — the app keeps running, the user gets told.
    expect(() => safeLocalStorage.setItem("k", "v")).not.toThrow();
    expect(seen).toEqual(["quota"]);

    stop();
  });

  it("announces a failure once, not on every write", () => {
    // A successful write clears the previous condition; persist writes on every
    // mutation, so a repeated failure must not produce a stream of toasts.
    safeLocalStorage.setItem("k", "ok");

    const seen: string[] = [];
    const stop = onStorageFailure(({ kind }) => seen.push(kind));

    setItem.mockImplementation(() => {
      throw quotaError();
    });
    safeLocalStorage.setItem("k", "1");
    safeLocalStorage.setItem("k", "2");
    safeLocalStorage.setItem("k", "3");
    expect(seen).toEqual(["quota"]);

    stop();
  });

  it("announces again after recovering", () => {
    safeLocalStorage.setItem("k", "ok");

    const seen: string[] = [];
    const stop = onStorageFailure(({ kind }) => seen.push(kind));

    setItem.mockImplementationOnce(() => {
      throw quotaError();
    });
    safeLocalStorage.setItem("k", "1");
    safeLocalStorage.setItem("k", "2"); // succeeds, clears the condition
    setItem.mockImplementationOnce(() => {
      throw quotaError();
    });
    safeLocalStorage.setItem("k", "3");

    expect(seen).toEqual(["quota", "quota"]);
    stop();
  });

  it("recognises a quota error that is not a DOMException of this realm", () => {
    // jsdom and node each bring their own DOMException, so instanceof cannot be
    // relied on — detection goes by name/code instead.
    const seen: string[] = [];
    const stop = onStorageFailure(({ kind }) => seen.push(kind));
    safeLocalStorage.setItem("k", "ok");

    setItem.mockImplementationOnce(() => {
      throw Object.assign(new Error("exceeded"), { name: "QuotaExceededError", code: 22 });
    });
    safeLocalStorage.setItem("k", "v");

    expect(seen).toEqual(["quota"]);
    stop();
  });

  it("reports a non-quota failure as such", () => {
    const seen: string[] = [];
    const stop = onStorageFailure(({ kind }) => seen.push(kind));
    safeLocalStorage.setItem("k", "ok");

    setItem.mockImplementationOnce(() => {
      throw Object.assign(new Error("blocked"), { name: "SecurityError" });
    });
    safeLocalStorage.setItem("k", "v");

    expect(seen).toEqual(["other"]);
    stop();
  });

  it("survives a getItem that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(safeLocalStorage.getItem("k")).toBeNull();
  });
});

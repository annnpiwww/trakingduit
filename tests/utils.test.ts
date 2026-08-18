import { describe, expect, it, vi } from "vitest";
import { newId } from "../src/lib/utils";
import { stringToUUID } from "../src/lib/bill-metrics";

describe("UUID generation and fallback", () => {
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it("newId generates a valid UUID v4 when crypto.randomUUID is available", () => {
    const id = newId();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it("newId fallback generates a valid UUID v4 when crypto.randomUUID is unavailable", () => {
    const originalCrypto = globalThis.crypto;
    // Mock crypto without randomUUID
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      writable: true,
      configurable: true,
    });

    try {
      const id = newId();
      expect(id).toMatch(UUID_V4_REGEX);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
    }
  });

  it("stringToUUID generates a deterministic valid UUID", () => {
    const uuid1 = stringToUUID("test-string-1");
    const uuid2 = stringToUUID("test-string-1");
    const uuid3 = stringToUUID("test-string-2");

    expect(uuid1).toMatch(UUID_V4_REGEX);
    expect(uuid1).toBe(uuid2);
    expect(uuid1).not.toBe(uuid3);
  });
});

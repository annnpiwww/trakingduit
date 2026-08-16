import { describe, expect, it } from "vitest";
import { shouldResetForLocalSignIn, shouldResetForSupabaseSignIn } from "../../src/lib/session-account";

describe("account isolation", () => {
  it("resets local data when a different local identity signs in", () => {
    expect(
      shouldResetForLocalSignIn({
        previousLocalAccountKey: "alice",
        nextLocalAccountKey: "bob",
      }),
    ).toBe(true);
  });

  it("does not reset data when the same local identity signs in again", () => {
    expect(
      shouldResetForLocalSignIn({
        previousLocalAccountKey: "alice",
        nextLocalAccountKey: "alice",
      }),
    ).toBe(false);
  });

  it("resets local cache when a cloud identity takes over", () => {
    expect(
      shouldResetForLocalSignIn({
        currentSupabaseUserId: "cloud-a",
        nextLocalAccountKey: "local:alice",
      }),
    ).toBe(true);
  });

  it("resets existing cloud cache only when the cloud user changes", () => {
    expect(
      shouldResetForSupabaseSignIn({
        currentSupabaseUserId: "user-a",
        nextSupabaseUserId: "user-b",
        hasExistingProfile: true,
      }),
    ).toBe(true);
    expect(
      shouldResetForSupabaseSignIn({
        currentSupabaseUserId: "user-a",
        nextSupabaseUserId: "user-a",
        hasExistingProfile: true,
      }),
    ).toBe(false);
  });
});

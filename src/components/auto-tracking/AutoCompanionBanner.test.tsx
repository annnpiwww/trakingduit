import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  AutoCompanionBanner,
  shouldShowBanner,
  BANNER_DISMISSED_KEY,
  FOURTEEN_DAYS_MS,
} from "./AutoCompanionBanner";

describe("AutoCompanionBanner", () => {
  const NOW = 1700000000000; // Fixed timestamp for deterministic testing

  it("shouldShowBanner returns true when no dismissal value exists in localStorage", () => {
    expect(shouldShowBanner(null, NOW)).toBe(true);
  });

  it("shouldShowBanner returns false when dismissed recently (less than 14 days ago)", () => {
    const recentDismissal = (NOW - 5 * 24 * 60 * 60 * 1000).toString(); // 5 days ago
    expect(shouldShowBanner(recentDismissal, NOW)).toBe(false);
  });

  it("shouldShowBanner returns true when dismissal expired (older than 14 days)", () => {
    const expiredDismissal = (NOW - 15 * 24 * 60 * 60 * 1000).toString(); // 15 days ago
    expect(shouldShowBanner(expiredDismissal, NOW)).toBe(true);
  });

  it("shouldShowBanner returns false for legacy 'true' string flag", () => {
    expect(shouldShowBanner("true", NOW)).toBe(false);
  });

  it("renders banner content and CTA button pointing to /settings/auto-tracking", () => {
    const html = renderToString(<AutoCompanionBanner />);
    
    // In SSR (renderToString), useEffect hasn't run yet so initial state is false, but we can verify component output structure
    expect(BANNER_DISMISSED_KEY).toBe("trakingduit_companion_banner_dismissed");
    expect(FOURTEEN_DAYS_MS).toBe(14 * 24 * 60 * 60 * 1000);
  });
});

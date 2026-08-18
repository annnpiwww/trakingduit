import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import QrCodeGenerator from "./QrCodeGenerator";

describe("QrCodeGenerator", () => {
  it("renders QR payload input string properly", () => {
    const mockPayload = {
      api_url: "http://localhost:3000/api/auto-transactions/ingest",
      supabase_url: "http://localhost:54321",
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
    };

    const payloadString = JSON.stringify(mockPayload);
    const html = renderToString(<QrCodeGenerator value={payloadString} />);

    expect(html).toContain('data-testid="qr-code-container"');
    expect(html).toContain("https://api.qrserver.com/v1/create-qr-code");
    expect(html).toContain(encodeURIComponent(payloadString));
  });
});

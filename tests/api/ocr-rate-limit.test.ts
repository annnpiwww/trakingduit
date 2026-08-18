import { describe, expect, it } from "vitest";

describe("POST /api/ocr", () => {
  it("returns 429 after sixty requests from the same client in one minute", async () => {
    const { POST } = await import("../../src/app/api/ocr/route");
    const request = () => new Request("http://localhost/api/ocr", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "198.51.100.8",
      },
      body: JSON.stringify({ image: "data:image/jpeg;base64,ZmFrZQ==" }),
    });

    const responses = [];
    for (let attempt = 0; attempt < 61; attempt += 1) {
      responses.push(await POST(request()));
    }

    expect(responses[60].status).toBe(429);
    expect(responses[60].headers.get("retry-after")).toBeTruthy();
  });
});

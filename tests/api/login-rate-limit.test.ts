import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabaseAdmin: () => null,
  supabaseServerClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      }),
    },
  }),
}));

import { POST } from "../../src/app/api/auth/login/route";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 429 after five invalid attempts for the same account and client", async () => {
    const headers = {
      "content-type": "application/json",
      "x-real-ip": "198.51.100.7",
    };

    const responses = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(await POST(new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: "brute-force-test@example.com",
          password: "wrong-password",
          mode: "login",
        }),
      })));
    }

    expect(responses.slice(0, 5).every((response) => response.status === 401)).toBe(true);
    expect(responses[5].status).toBe(429);
    expect(responses[5].headers.get("retry-after")).toBeTruthy();
  });
});

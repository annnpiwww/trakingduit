import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import * as supabaseModule from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabaseFromRequest: vi.fn(),
  supabaseAdmin: vi.fn(),
  isSupabaseConfigured: true,
}));

describe("POST /api/auto-transactions/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });
    const mockSupabase = {
      auth: { getUser: mockGetUser },
      from: vi.fn().mockReturnValue({}),
    };
    vi.mocked(supabaseModule.supabaseFromRequest).mockReturnValue(mockSupabase as any);
  });

  it("should return 401 Unauthorized if Authorization header is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/auto-transactions/ingest", {
      method: "POST",
      body: JSON.stringify({
        source_app: "id.co.bri.brimo",
        amount: 50000,
        type: "expense",
        merchant: "Kopi Kenangan",
        notification_hash: "hash123",
        transaction_timestamp: "2026-08-18T10:00:00Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain("authorization header");
  });

  it("should return 400 Bad Request when JSON payload is invalid or incomplete", async () => {
    const req = new NextRequest("http://localhost:3000/api/auto-transactions/ingest", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source_app: "id.co.bri.brimo",
        // missing required fields amount, type, notification_hash, etc.
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain("Missing required payload fields");
  });

  it("should return status duplicate_ignored on duplicate notification_hash", async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const mockMaybeSingleLog = vi.fn().mockResolvedValue({
      data: { id: "existing-log-1", status: "success" },
      error: null,
    });

    const mockInsert = vi.fn().mockReturnValue({
      catch: vi.fn().mockResolvedValue(null),
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === "auto_transaction_logs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockMaybeSingleLog,
              }),
            }),
          }),
          insert: mockInsert,
        };
      }
      return {};
    });

    const mockSupabase = {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    };

    vi.mocked(supabaseModule.supabaseFromRequest).mockReturnValue(mockSupabase as any);

    const req = new NextRequest("http://localhost:3000/api/auto-transactions/ingest", {
      method: "POST",
      headers: {
        authorization: "Bearer test-jwt-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source_app: "id.co.bri.brimo",
        amount: 50000,
        type: "expense",
        merchant: "Kopi Kenangan",
        notification_hash: "existing-hash-123",
        transaction_timestamp: "2026-08-18T10:00:00Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("duplicate_ignored");
  });

  it("should successfully create auto-transaction and log into auto_transaction_logs", async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const mockMaybeSingleLog = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockAppWalletSingle = vi.fn().mockResolvedValue({
      data: { id: "wallet-bri-123" },
      error: null,
    });

    const mockInsertTxSingle = vi.fn().mockResolvedValue({
      data: { id: "tx-created-999" },
      error: null,
    });

    const mockInsertLog = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === "auto_transaction_logs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockMaybeSingleLog,
              }),
            }),
          }),
          insert: mockInsertLog,
        };
      }
      if (table === "wallets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: mockAppWalletSingle,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "categories") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: "cat-makanan", name: "Makanan & Minuman", keywords: ["kopi"] }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "transactions") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockInsertTxSingle,
            }),
          }),
        };
      }
      return {};
    });

    const mockSupabase = {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    };

    vi.mocked(supabaseModule.supabaseFromRequest).mockReturnValue(mockSupabase as any);

    const req = new NextRequest("http://localhost:3000/api/auto-transactions/ingest", {
      method: "POST",
      headers: {
        authorization: "Bearer test-jwt-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source_app: "id.co.bri.brimo",
        amount: 35000,
        type: "expense",
        merchant: "Kopi Kenangan",
        notification_hash: "unique-hash-789",
        transaction_timestamp: "2026-08-18T10:30:00Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("success");
    expect(json.transaction_id).toBe("tx-created-999");
    expect(json.wallet_id).toBe("wallet-bri-123");
    expect(mockInsertLog).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        notification_hash: "unique-hash-789",
        source_app: "id.co.bri.brimo",
        amount: 35000,
        status: "success",
      })
    );
  });
});

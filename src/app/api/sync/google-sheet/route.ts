import { NextResponse } from "next/server";
import { google } from "googleapis";
import { SHEET_HEADERS, sheetRowToObject, type SheetRow } from "@/lib/export";
import { isSupabaseConfigured, supabaseFromRequest } from "@/lib/supabase";
import { sheetSyncRequestSchema, createErrorResponse } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function config() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.GOOGLE_SHEET_TAB ?? "Transactions";
  if (!email || !key || !spreadsheetId) return null;
  return { email, key, spreadsheetId, tab };
}

function sheetsClient(cfg: NonNullable<ReturnType<typeof config>>) {
  const auth = new google.auth.JWT({ email: cfg.email, key: cfg.key, scopes: SCOPES });
  return google.sheets({ version: "v4", auth });
}

function rowToValues(row: SheetRow): (string | number)[] {
  return [
    row.id,
    row.date,
    row.type,
    row.amount,
    row.wallet,
    row.to_wallet,
    row.category,
    row.merchant,
    row.note,
    row.source,
    row.updated_at,
    row.deleted,
  ];
}

/** GET — connection check so Settings can show the sheet name before syncing. */
export async function GET(request: Request) {
  if (isSupabaseConfigured) {
    const sb = supabaseFromRequest(request);
    if (!sb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const cfg = config();
  if (!cfg) {
    return NextResponse.json(
      { connected: false, error: "Kredensial Google Sheets belum diatur" },
      { status: 501 },
    );
  }
  try {
    const sheets = sheetsClient(cfg);
    const meta = await sheets.spreadsheets.get({ spreadsheetId: cfg.spreadsheetId });
    return NextResponse.json({
      connected: true,
      title: meta.data.properties?.title ?? "",
      tab: cfg.tab,
      tabs: meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean) ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { connected: false, error: err instanceof Error ? err.message : "Gagal akses spreadsheet" },
      { status: 502 },
    );
  }
}

/**
 * POST — two-way sync. The client sends its full transaction snapshot; rows are
 * merged by id with last-write-wins on `updated_at`, the sheet is rewritten
 * with the merged set, and rows the client is missing (or has an older copy of)
 * come back in `pulled`.
 */
export async function POST(request: Request) {
  if (isSupabaseConfigured) {
    const sb = supabaseFromRequest(request);
    if (!sb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const cfg = config();
  if (!cfg) {
    return NextResponse.json(
      { error: "Kredensial Google Sheets belum diatur", fallback: "manual" },
      { status: 501 },
    );
  }

  let rows: SheetRow[] = [];
  try {
    const body = await request.json();
    const validated = sheetSyncRequestSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        createErrorResponse(`Invalid request: ${validated.error.issues.map(i => i.message).join(", ")}`),
        { status: 400 }
      );
    }
    
    rows = validated.data.rows;
  } catch (err) {
    return NextResponse.json(
      createErrorResponse("Body JSON tidak valid atau malformed"),
      { status: 400 }
    );
  }

  try {
    const sheets = sheetsClient(cfg);
    const range = `${cfg.tab}!A:L`;

    const existing = await sheets.spreadsheets.values
      .get({ spreadsheetId: cfg.spreadsheetId, range })
      .catch(async (err) => {
        // tab missing → create it, then continue with an empty set
        if (String(err).includes("Unable to parse range")) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: cfg.spreadsheetId,
            requestBody: { requests: [{ addSheet: { properties: { title: cfg.tab } } }] },
          });
          return { data: { values: [] as string[][] } };
        }
        throw err;
      });

    const values = (existing.data.values ?? []) as (string | number)[][];
    const dataRows = values.length && String(values[0][0]).toLowerCase() === "id" ? values.slice(1) : values;

    const remote = new Map<string, SheetRow>();
    for (const raw of dataRows) {
      const row = sheetRowToObject(raw);
      if (row) remote.set(row.id, row);
    }

    const merged = new Map(remote);
    const pulled: SheetRow[] = [];
    let pushed = 0;

    const localIds = new Set(rows.map((r) => r.id));
    for (const local of rows) {
      const r = remote.get(local.id);
      if (!r || local.updated_at > r.updated_at) {
        merged.set(local.id, local);
        pushed++;
      } else if (r.updated_at > local.updated_at) {
        pulled.push(r);
      }
    }
    // rows that exist only in the sheet (added from another device or by hand)
    for (const [id, row] of remote) {
      if (!localIds.has(id)) pulled.push(row);
    }

    const body = [...merged.values()]
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
      .map(rowToValues);

    await sheets.spreadsheets.values.update({
      spreadsheetId: cfg.spreadsheetId,
      range: `${cfg.tab}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [SHEET_HEADERS as unknown as string[], ...body] },
    });

    // drop stale trailing rows left over from a previously larger sheet
    const previousRowCount = dataRows.length;
    if (previousRowCount > body.length) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: cfg.spreadsheetId,
        range: `${cfg.tab}!A${body.length + 2}:L${previousRowCount + 1}`,
      });
    }

    return NextResponse.json({
      pushed,
      pulled,
      total: merged.size,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sinkron gagal" },
      { status: 502 },
    );
  }
}

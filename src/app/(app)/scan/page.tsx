"use client";

import * as React from "react";
import Image from "next/image";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Camera,
  Check,
  FileText,
  ImageUp,
  RefreshCw,
  ScanLine,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { createReceipt, deleteReceipt, guessCategory, updateReceipt } from "@/lib/repo";
import { compressReceiptImage, prepareImage, runOcr } from "@/lib/ocr/client";
import { consumeQuota, useSubscription } from "@/lib/subscription";
import { parseReceipt, reconcileItemTotal } from "@/lib/ocr/parser";
import type { ParsedReceipt, Receipt } from "@/lib/types";
import { cn, formatIDR, toDateKey } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Progress,
  Sheet,
  useToast,
} from "@/components/ui";
import { TransactionSheet, type TransactionDraft } from "@/components/transactions/transaction-sheet";

export default function ScanPage() {
  const toast = useToast();
  const router = useRouter();
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { ocr } = useSubscription();
  const quotaExhausted = ocr.left <= 0;

  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [stage, setStage] = React.useState("");
  const [current, setCurrent] = React.useState<Receipt | null>(null);
  const [draft, setDraft] = React.useState<TransactionDraft | null>(null);
  const [rawOpen, setRawOpen] = React.useState(false);

  const receipts = useLiveQuery(
    () => db().receipts.filter((r) => !r.deleted).reverse().sortBy("created_at"),
    [],
    [],
  );

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast("File harus berupa gambar", "error");
      return;
    }
    if (quotaExhausted) {
      toast(
        ocr.unlimited
          ? "Soft cap scan hari ini kesentuh (100x). Besok bisa lagi ya!"
          : "Kuota scan hari ini habis. Upgrade buat scan lebih banyak!",
        "error",
      );
      if (!ocr.unlimited) router.push("/premium");
      return;
    }
    setBusy(true);
    setProgress(0.02);
    setStage("Nyiapin gambar...");
    try {
      const dataUrl = await prepareImage(file);
      const { text, parsed: ocrParsed, engine } = await runOcr(dataUrl, (ratio, s) => {
        setProgress(ratio);
        setStage(s);
      });
      await consumeQuota("ocr");
      const parsed = ocrParsed ?? parseReceipt(text);
      // Shrink the stored copy — OCR already ran on the full-res data URL.
      const image = await compressReceiptImage(dataUrl);
      const receipt = await createReceipt({
        image,
        raw_text: text,
        parsed,
        status: "pending",
        engine,
      });
      setCurrent(receipt);
      toast(
        parsed.total
          ? `Terbaca: ${formatIDR(parsed.total)}${parsed.merchant ? ` di ${parsed.merchant}` : ""}`
          : "Nota terbaca, cek hasilnya",
        parsed.total ? "success" : "info",
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal baca struk", "error");
    } finally {
      setBusy(false);
      setProgress(0);
      setStage("");
    }
  }

  async function confirmReceipt(receipt: Receipt) {
    const wallet = await db().wallets.filter((w) => !w.deleted && !w.archived).first();
    const guess = await guessCategory(
      `${receipt.parsed.merchant ?? ""} ${receipt.raw_text.slice(0, 200)}`,
      "expense",
    );
    setDraft({
      type: "expense",
      amount: receipt.parsed.total ?? 0,
      merchant: receipt.parsed.merchant,
      date: receipt.parsed.date ?? toDateKey(),
      wallet_id: wallet?.id,
      category_id: guess?.id,
      note: receipt.parsed.items
        .slice(0, 4)
        .map((i) => i.name)
        .join(", "),
      receipt_id: receipt.id,
      source: "ocr",
    });
  }

  return (
    <div className="space-y-4">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <ScanLine className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight">Scan struk belanja</h2>
            <p className="mt-1 text-xs text-muted">
              Foto struknya, nominal sama nama toko bakal keisi otomatis. Bisa lo edit sebelum disimpen.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">
              {ocr.unlimited ? (
                <Badge tone="brand">Scan unlimited</Badge>
              ) : (
                <Badge tone={quotaExhausted ? "expense" : "neutral"}>
                  Sisa {ocr.left}/{ocr.limit} scan hari ini
                </Badge>
              )}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button className="w-full sm:w-auto" onClick={() => cameraRef.current?.click()} disabled={busy || quotaExhausted}>
                <Camera className="size-4" /> Ambil foto
              </Button>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => fileRef.current?.click()}
                disabled={busy || quotaExhausted}
              >
                <ImageUp className="size-4" /> Pilih gambar
              </Button>
              {quotaExhausted ? (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => router.push("/premium")}
                >
                  Upgrade kuota
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {busy ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
              <span>{stage}</span>
              <span className="num">{Math.round(progress * 100)}%</span>
            </div>
            <Progress value={progress * 100} />
          </div>
        ) : null}
      </Card>

      {current ? (
        <ReceiptDetail
          receipt={current}
          onConfirm={() => confirmReceipt(current)}
          onShowRaw={() => setRawOpen(true)}
          onPatch={async (patch) => {
            const next = { ...current, parsed: { ...current.parsed, ...patch } };
            await updateReceipt(current.id, { parsed: next.parsed });
            setCurrent(next);
          }}
        />
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader title="Riwayat scan" subtitle={`${receipts.length} nota`} />
        {receipts.length ? (
          <ul className="mt-2 divide-y divide-border border-t border-border">
            {receipts.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                {r.image ? (
                  <Image
                    src={r.image}
                    alt="Nota"
                    width={40}
                    height={52}
                    unoptimized
                    className="h-13 w-10 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <span className="grid h-13 w-10 place-items-center rounded-lg border border-border text-muted">
                    <FileText className="size-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.parsed.merchant ?? "Nota tanpa nama"}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {r.parsed.date ?? r.created_at.slice(0, 10)} ·{" "}
                    {r.engine === "gemini" ? "Gemini AI" : r.engine === "ai-ocr" ? "Tradu" : r.engine === "google-vision" ? "Vision" : "Tesseract"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="num text-sm font-medium">
                      {r.parsed.total ? formatIDR(r.parsed.total) : "-"}
                    </span>
                    <Badge tone={r.status === "confirmed" ? "income" : "warn"}>
                      {r.status === "confirmed" ? "Tersimpan" : "Pending"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Buka"
                    onClick={() => setCurrent(r)}
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Hapus"
                    onClick={async () => {
                      await deleteReceipt(r.id);
                      if (current?.id === r.id) setCurrent(null);
                    }}
                  >
                    <Trash2 className="size-3.5 text-expense" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={ScanLine}
            title="Belum ada nota"
            description="Hasil scan tersimpan di perangkat, termasuk teks mentah OCR."
          />
        )}
      </Card>

      <Sheet
        open={rawOpen}
        onClose={() => setRawOpen(false)}
        title="Teks mentah OCR"
        description="Dipakai untuk mengecek hasil parsing"
        size="lg"
      >
        <pre className="whitespace-pre-wrap text-xs text-muted">{current?.raw_text}</pre>
      </Sheet>

      <TransactionSheet
        open={Boolean(draft)}
        draft={draft ?? undefined}
        onClose={() => setDraft(null)}
        onSaved={async () => {
          if (current) {
            await updateReceipt(current.id, { status: "confirmed" });
            setCurrent({ ...current, status: "confirmed" });
          }
        }}
      />
    </div>
  );
}

function ReceiptDetail({
  receipt,
  onConfirm,
  onShowRaw,
  onPatch,
}: {
  receipt: Receipt;
  onConfirm: () => void;
  onShowRaw: () => void;
  onPatch: (patch: Partial<ParsedReceipt>) => void;
}) {
  // Reconcile stored single-item totals on display too — older receipts may
  // hold a misread unit price (e.g. SPBU 10.002 read as 15.898).
  const p = reconcileItemTotal(receipt.parsed);
  const [preview, setPreview] = React.useState(false);
  const lowConfidence = p.confidence < 0.6;
  const itemsSum = p.items.reduce((a, i) => a + (i.qty ? i.qty * i.price : i.price), 0);
  const itemsMismatch =
    p.total != null && itemsSum > 0 && Math.abs(itemsSum - p.total) / p.total > 0.25;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Hasil pembacaan"
        subtitle={`Akurasi perkiraan ${Math.round(p.confidence * 100)}% · ${
          receipt.engine === "gemini" ? "Gemini AI" : receipt.engine === "ai-ocr" ? "Tradu" : receipt.engine === "google-vision" ? "Google Vision" : "Tesseract"
        }`}
        action={
          <Button variant="ghost" size="sm" onClick={onShowRaw}>
            <FileText className="size-3.5" /> Teks mentah
          </Button>
        }
      />
      <div className="grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
        {receipt.image ? (
          <button
            type="button"
            onClick={() => setPreview(true)}
            className="block cursor-zoom-in text-left"
            aria-label="Lihat nota ukuran penuh"
          >
            <Image
              src={receipt.image}
              alt="Nota"
              width={320}
              height={420}
              unoptimized
              className="max-h-64 w-full rounded-xl border border-border object-cover transition group-hover:opacity-90 sm:max-h-none"
            />
          </button>
        ) : null}

        <div className="space-y-3">
          {lowConfidence ? (
            <p className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              Hasil kurang yakin. Cek nominal dan tanggal sebelum menyimpan.
            </p>
          ) : null}

          <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
            <p className="text-sm font-semibold leading-snug">
              {p.merchant ?? "Nama toko belum terbaca"}
            </p>
            {p.address ? (
              <p className="mt-0.5 truncate text-xs text-muted">{p.address}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <EditableField
              label="Merchant"
              value={p.merchant ?? ""}
              onChange={(v) => onPatch({ merchant: v || undefined })}
            />
            <EditableField
              label="Tanggal"
              type="date"
              value={p.date ?? toDateKey()}
              onChange={(v) => onPatch({ date: v })}
            />
            <EditableField
              label="Total"
              inputMode="numeric"
              value={p.total != null ? String(p.total) : ""}
              onChange={(v) => onPatch({ total: Number(v.replace(/\D/g, "")) || undefined })}
              hint={p.total ? formatIDR(p.total) : undefined}
            />
            <EditableField
              label="Pajak / PPN"
              inputMode="numeric"
              value={p.tax != null ? String(p.tax) : ""}
              onChange={(v) => onPatch({ tax: Number(v.replace(/\D/g, "")) || undefined })}
            />
          </div>

          <EditableField
            label="Alamat"
            value={p.address ?? ""}
            onChange={(v) => onPatch({ address: v || undefined })}
          />

          {p.items.length ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <p className="border-b border-border px-3 py-2 text-xs font-medium">
                Item terbaca ({p.items.length})
              </p>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
                      <th className="px-3 py-1.5 text-left font-medium">Item</th>
                      <th className="px-2 py-1.5 text-right font-medium">Qty</th>
                      <th className="px-2 py-1.5 text-right font-medium">Harga</th>
                      <th className="px-3 py-1.5 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {p.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <span className="block truncate">{item.name}</span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right text-muted">
                          {item.qty ? `${item.qty}${item.unit ? ` ${item.unit}` : "×"}` : "—"}
                        </td>
                        <td className="num whitespace-nowrap px-2 py-2 text-right text-muted">
                          {formatIDR(item.price)}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2 text-right font-medium">
                          {formatIDR(item.qty ? item.qty * item.price : item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {itemsMismatch ? (
                <p className="flex items-start gap-2 border-t border-border bg-warn/10 px-3 py-2 text-xs text-warn">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  Total item ({formatIDR(itemsSum)}) gak nyambung sama total struk ({formatIDR(p.total!)})
                  — cek harga satuan, bisa salah baca digit.
                </p>
              ) : null}
            </div>
          ) : null}

          <Button
            className={cn("w-full", receipt.status === "confirmed" && "opacity-70")}
            onClick={onConfirm}
          >
            <Check className="size-4" />
            {receipt.status === "confirmed" ? "Catat lagi dari nota ini" : "Jadikan transaksi"}
          </Button>
        </div>
      </div>

      <Sheet
        open={preview}
        onClose={() => setPreview(false)}
        title="Nota"
        description={receipt.parsed.merchant ?? "Hasil scan"}
        size="lg"
      >
        {receipt.image ? (
          <Image
            src={receipt.image}
            alt="Nota"
            width={800}
            height={1000}
            unoptimized
            className="w-full rounded-xl border border-border"
          />
        ) : null}
      </Sheet>
    </Card>
  );
}

function EditableField({
  label,
  value,
  onChange,
  hint,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  type?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-sm outline-none focus:border-brand"
      />
      {hint ? <span className="mt-0.5 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

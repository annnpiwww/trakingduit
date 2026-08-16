"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendHorizontal, Sparkles } from "lucide-react";
import { Sheet, Button, Badge } from "@/components/ui";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { supabaseBrowser } from "@/lib/supabase";
import { consumeQuota, useSubscription } from "@/lib/subscription";
import { allWalletBalances } from "@/lib/repo";
import Link from "next/link";
import { totals } from "@/lib/analytics";
import { monthRange, toDateKey, toMonthKey } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Duitku aman gak bulan ini?",
  "Kategori mana yang paling bikin tekor?",
  "Kasih tips hemat minggu ini dong",
  "Cara capai target nabung gimana?",
];

export function TraduChat({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { tradu } = useSubscription();
  const quotaExhausted = tradu.left <= 0;

  // Load financial database information using Dexie hooks
  const month = toMonthKey();
  const categories = useLiveQuery(() => db().categories.filter((c) => !c.deleted).toArray(), [], []);
  const budgets = useLiveQuery(() => db().budgets.filter((b) => !b.deleted).toArray(), [], []);
  const bills = useLiveQuery(() => db().bills.filter((b) => !b.deleted && !b.archived).toArray(), [], []);
  const debts = useLiveQuery(() => db().debts.filter((d) => !d.deleted).toArray(), [], []);
  const goals = useLiveQuery(() => db().goals.filter((g) => !g.deleted && !g.archived).toArray(), [], []);
  const wallets = useLiveQuery(() => db().wallets.filter((w) => !w.deleted && !w.archived).toArray(), [], []);
  const balances = useLiveQuery(
    async () => {
      await db().transactions.count();
      await db().wallets.count();
      return allWalletBalances();
    },
    [],
    {} as Record<string, number>,
  );
  const allTx = useLiveQuery(() => db().transactions.filter((t) => !t.deleted).toArray(), [], []);
  const monthTx = useLiveQuery(() => {
    const { from, to } = monthRange(month);
    return db()
      .transactions.where("date")
      .between(from, to, true, true)
      .filter((t) => !t.deleted)
      .toArray();
  }, [month], []);

  const lastMonth = React.useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [month]);

  const lastMonthTx = useLiveQuery(() => {
    const { from, to } = monthRange(lastMonth);
    return db()
      .transactions.where("date")
      .between(from, to, true, true)
      .filter((t) => !t.deleted)
      .toArray();
  }, [lastMonth], []);

  const totalBalance = Object.values(balances).reduce((a, b) => a + b, 0);
  const t = totals(monthTx);
  const lastMonthExpense = totals(lastMonthTx).expense;

  const walletsList = React.useMemo(() => {
    if (!wallets) return [];
    return wallets.map((w) => ({
      name: w.name,
      type: w.type,
      balance: balances[w.id] ?? 0,
    }));
  }, [wallets, balances]);

  const debtsList = React.useMemo(() => {
    if (!debts) return [];
    return debts.map((d) => ({
      person: d.person,
      type: d.type === "payable" ? "Utang lo ke dia" : "Piutang (dia ngutang ke lo)",
      amount: d.amount,
      paid: d.paid_amount,
      remaining: d.amount - d.paid_amount,
      due_date: d.due_date ?? "Tidak ada",
    }));
  }, [debts]);

  const goalsList = React.useMemo(() => {
    if (!goals) return [];
    return goals.map((g) => ({
      name: g.name,
      target: g.target_amount,
      saved: g.saved_amount,
      progress: g.target_amount > 0 ? Math.round((g.saved_amount / g.target_amount) * 100) : 0,
      deadline: g.deadline ?? "Tidak ada",
    }));
  }, [goals]);

  const billsList = React.useMemo(() => {
    if (!bills) return [];
    return bills.map((b) => ({
      name: b.name,
      amount: b.amount,
      due_date: b.due_date,
      repeat: b.repeat,
    }));
  }, [bills]);

  const budgetUsage = React.useMemo(() => {
    if (!budgets?.length || !allTx?.length) return [];
    return budgets.map((b) => {
      const cat = categories?.find((c) => c.id === b.category_id);
      const spent = allTx
        .filter((tx) => tx.type === "expense" && tx.category_id === b.category_id && tx.date.startsWith(month))
        .reduce((a, tx) => a + tx.amount, 0);
      return { name: cat?.name ?? "Tanpa kategori", used: b.amount > 0 ? spent / b.amount : 0 };
    });
  }, [budgets, allTx, categories, month]);

  const recentTransactions = React.useMemo(() => {
    if (!allTx) return [];
    return [...allTx]
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
      .slice(0, 50)
      .map((tx) => {
        const cat = categories?.find((c) => c.id === tx.category_id);
        const w = wallets?.find((w) => w.id === tx.wallet_id);
        return {
          date: tx.date,
          description: tx.merchant || tx.note || cat?.name || (tx.type === "income" ? "Pemasukan" : "Pengeluaran"),
          category: cat?.name ?? "Lainnya",
          wallet: w?.name ?? "Dompet",
          type: tx.type,
          amount: tx.amount,
        };
      });
  }, [allTx, categories, wallets]);

  const topCategories = React.useMemo(() => {
    if (!monthTx || !categories) return [];
    const catsMap: Record<string, { total: number; count: number }> = {};
    monthTx
      .filter((tx) => tx.type === "expense")
      .forEach((tx) => {
        const cat = categories.find((c) => c.id === tx.category_id);
        const name = cat?.name ?? "Lainnya";
        if (!catsMap[name]) {
          catsMap[name] = { total: 0, count: 0 };
        }
        catsMap[name].total += tx.amount;
        catsMap[name].count += 1;
      });
    return Object.entries(catsMap)
      .map(([name, val]) => ({
        name,
        total: val.total,
        share: t.expense > 0 ? val.total / t.expense : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [monthTx, categories, t.expense]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  // Welcome on first open
  React.useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Halo! Aku Tradu, asisten keuangankamu. Butuh analisis keuangan, saran hemat, atau tips kelola anggaran? Sini sharing bareng aku! 😊",
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sendMessage = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || typing) return;

      if (quotaExhausted) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: tradu.unlimited
              ? "Soft cap Tradu hari ini udah kesentuh (200 pesan). Besok bisa lanjut lagi ya! ✨"
              : "Kuota Tradu hari ini udah habis nih. Upgrade ke Premium biar bisa lanjut ngobrol terus! ✨",
          },
        ]);
        return;
      }

      const newUserMsg: Message = { id: `u-${Date.now()}`, role: "user", content: trimmed };
      setMessages((prev) => [...prev, newUserMsg]);
      setInput("");
      setTyping(true);

      try {
        const currentMessages = [...messages, newUserMsg];
        const sb = supabaseBrowser();
        const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
        const res = await fetch("/api/tradu", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {}),
          },
          // Server punya deadline 55s; client abort di 60s biar user gak
          // nunggu selamanya kalau semua jalur AI hang.
          signal: AbortSignal.timeout(60_000),
          body: JSON.stringify({
            messages: currentMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            financialContext: {
              totalBalance,
              income: t.income,
              expense: t.expense,
              net: t.net,
              lastMonthExpense,
              wallets: walletsList,
              budgetUsage,
              bills: billsList,
              debts: debtsList,
              goals: goalsList,
              topCategories,
              recentTransactions,
            },
          }),
        });

        if (!res.ok) {
          // Baca body error (server kirim `detail` teknis, mis. "proxy: API Error
          // (401): API key required") biar diagnosa gampang tanpa buka Vercel logs.
          let detail = "";
          try {
            const errBody = (await res.json()) as { error?: string; detail?: string };
            detail = errBody.detail ?? errBody.error ?? "";
          } catch {
            /* body bukan JSON — abaikan */
          }
          console.error("AI Error detail:", res.status, detail || `HTTP ${res.status}`);
          throw new Error(detail || "HTTP error " + res.status);
        }
        // Quota dipakai HANYA kalau AI berhasil jawab — request gagal (502,
        // timeout) jangan sampai buang kuota user.
        if (!quotaExhausted) await consumeQuota("tradu");

        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.reply || "Gokil, Tradu lagi kehabisan kata-kata nih. Cabut ah! 🫢",
          },
        ]);
      } catch (error) {
        console.error("AI Error:", error);
        // 401 dari proxy = API key ditolak — kasih tahu user biar dia ngerti
        // kenapa Tradu mati (auth OmniRoute aktif, key belum diupdate).
        const msg = error instanceof Error ? error.message : "";
        const isAuth =
          msg.includes("401") || msg.includes("API key") || msg.includes("Unauthorized");
        const isTimeout =
          error instanceof DOMException && error.name === "TimeoutError";
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: isAuth
              ? "Maaf, koneksi AI Tradu ditolak — API key-nya belum di-update. Kabarin admin biar segera dibenerin ya~ 🙏"
              : isTimeout
                ? "Tradu lagi lama mikir nih, coba lagi yaa~"
                : "Maaf, Koneksi AI Tradu lagi bermasalah nih, coba lagi nanti yaa~",
          },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [
      typing,
      messages,
      quotaExhausted,
      totalBalance,
      t.income,
      t.expense,
      t.net,
      lastMonthExpense,
      walletsList,
      budgetUsage,
      billsList,
      debtsList,
      goalsList,
      topCategories,
      recentTransactions,
    ],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Chat with Tradu ✨"
      size="lg"
      description={
        <span className="flex items-center gap-1.5">
          {tradu.unlimited ? (
            <Badge tone="brand">Unlimited</Badge>
          ) : (
            <Badge tone={quotaExhausted ? "expense" : "neutral"}>
              Sisa {tradu.left}/{tradu.limit} hari ini
            </Badge>
          )}
          {quotaExhausted ? (
            <Link href="/premium" onClick={onClose} className="text-brand underline underline-offset-2">
              Upgrade
            </Link>
          ) : null}
        </span>
      }
    >
      <div className="-mx-5 -mt-4 flex h-[60dvh] flex-col sm:h-[450px]">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md bg-brand text-white"
                      : "rounded-bl-md bg-surface-2 text-fg"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-brand">
                      <Sparkles className="size-3" />
                      Tradu
                    </div>
                  )}
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {typing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-surface-2 px-4 py-3">
                <div className="flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted/60 [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted/60 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted/60 [animation-delay:300ms]" />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Quick prompts — only before user sends first message */}
        {messages.length <= 1 && !quotaExhausted && (
          <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] text-muted transition hover:border-brand hover:text-brand active:scale-95"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        {quotaExhausted ? (
          <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
            {tradu.unlimited ? (
              <p className="py-2 text-center text-[11px] text-muted">
                Soft cap {tradu.limit} pesan/hari. Reset besok ya.
              </p>
            ) : (
              <>
                <Link href="/premium" onClick={onClose}>
                  <Button className="w-full" size="lg">
                    Upgrade ke Premium
                  </Button>
                </Link>
                <p className="text-center text-[11px] text-muted">
                  Kuota gratis {tradu.limit} pesan/hari. Reset besok, atau upgrade sekarang.
                </p>
              </>
            )}
          </div>
        ) : (
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-border px-4 py-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya apa aja, santai aja"
            className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition placeholder:text-xs placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
            disabled={typing}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || typing} className="shrink-0">
            <SendHorizontal className="size-4" />
          </Button>
        </form>
        )}
      </div>
    </Sheet>
  );
}

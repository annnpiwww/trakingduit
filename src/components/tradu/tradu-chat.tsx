"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendHorizontal, Sparkles } from "lucide-react";
import { Sheet, Button } from "@/components/ui";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { supabaseBrowser } from "@/lib/supabase";
import { allWalletBalances } from "@/lib/repo";
import { totals } from "@/lib/analytics";
import { monthRange, toMonthKey } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Roast pengeluaran gw",
  "Boros di mana aja?",
  "Cukup buat foya-foya gak?",
  "Tips nabung dong",
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

  // Load financial database information using Dexie hooks
  const month = toMonthKey();
  const categories = useLiveQuery(() => db().categories.filter((c) => !c.deleted).toArray(), [], []);
  const balances = useLiveQuery(
    async () => {
      await db().transactions.count();
      await db().wallets.count();
      return allWalletBalances();
    },
    [],
    {} as Record<string, number>,
  );
  const monthTx = useLiveQuery(() => {
    const { from, to } = monthRange(month);
    return db()
      .transactions.where("date")
      .between(from, to, true, true)
      .filter((t) => !t.deleted)
      .toArray();
  }, [month], []);

  const totalBalance = Object.values(balances).reduce((a, b) => a + b, 0);
  const t = totals(monthTx);

  const recent = React.useMemo(
    () =>
      [...monthTx]
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
        .slice(0, 3),
    [monthTx],
  );

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
      .slice(0, 3);
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
              topCategories,
              recentTransactions: recent.map((tx) => {
                const cat = categories?.find((c) => c.id === tx.category_id);
                return {
                  date: tx.date,
                  description: tx.merchant || cat?.name || (tx.type === "income" ? "Pemasukan" : "Pengeluaran"),
                  type: tx.type,
                  amount: tx.amount,
                };
              }),
            },
          }),
        });

        if (!res.ok) {
          throw new Error("HTTP error " + res.status);
        }

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
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: "Maaf, Koneksi AI Tradu lagi bermasalah nih, coba lagi nanti yaa~",
          },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [typing, messages, totalBalance, t.income, t.expense, t.net, topCategories, recent],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Chat with Tradu ✨" size="lg">
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
        {messages.length <= 1 && (
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
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-border px-4 py-3"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya Tradu..."
            className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition placeholder:text-xs placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
            disabled={typing}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || typing} className="shrink-0">
            <SendHorizontal className="size-4" />
          </Button>
        </form>
      </div>
    </Sheet>
  );
}

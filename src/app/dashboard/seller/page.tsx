
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import type { Transaction } from "@/types/transaction";

export default function SellerDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const statusLabel: Record<string, string> = {
    pending_payment: "Pending payment",
    payment_simulated: "Payment simulated",
    seller_confirmed: "Seller confirmed",
    awaiting_delivery: "Awaiting delivery",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    disputed: "Disputed",
  };

  const loadTransactions = useCallback(async () => {
    try {
      const response = await fetch("/api/transactions", { cache: "no-store" });
      const result = await response.json();

      if (response.status === 401) {
        router.replace("/auth");
        return;
      }

      if (!response.ok) throw new Error(result.error ?? "Could not load transactions.");
      setTransactions(result.transactions ?? []);
    } catch (err) {
      setMessages((old) => ({
        ...old,
        page: err instanceof Error ? err.message : "Could not load transactions.",
      }));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      if (!data.user) {
        router.replace("/auth");
        return;
      }
      setEmail(data.user.email ?? "");
      void loadTransactions();
    });

    return () => {
      isMounted = false;
    };
  }, [loadTransactions, router]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  async function confirmTransaction(id: string) {
    setMessages((old) => ({ ...old, [id]: "Checking code…" }));

    try {
      const response = await fetch("/api/transactions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: id, code: codes[id] ?? "" }),
      });
      const result = await response.json();

      setMessages((old) => ({
        ...old,
        [id]: response.ok ? result.message : result.error ?? "Confirmation failed.",
      }));

      if (response.ok) {
        setCodes((old) => ({ ...old, [id]: "" }));
        await loadTransactions();
      }
    } catch {
      setMessages((old) => ({ ...old, [id]: "Network error. Please try again." }));
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-extrabold text-blue-800">SafePay.</Link>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            <LogOut size={17} /> Log out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Seller dashboard</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Incoming transactions</h1>
        <p className="mt-2 text-slate-500">Signed in as {email}. Enter the buyer’s code only after the agreed handover.</p>

        <div className="mt-7 flex justify-end">
          <button onClick={() => { setLoading(true); loadTransactions(); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-100">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-center text-slate-500">Loading transactions…</p>
        ) : transactions.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <ShieldCheck className="mx-auto text-blue-700" size={38} />
            <h2 className="mt-3 text-lg font-bold">No incoming transactions</h2>
            <p className="mt-2 text-sm text-slate-500">Transactions addressed to your registered email will appear here.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {transactions.map((t) => (
              <article key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{t.item_description}</h2>
                    <p className="mt-1 text-sm text-slate-500">Buyer ID: {t.buyer_id}</p>
                  </div>
                  <p className="text-xl font-extrabold">${Number(t.amount).toFixed(2)}</p>
                </div>

                <p className="mt-3 break-all text-xs text-slate-400">Transaction ID: {t.id}</p>
                <p className="mt-3 text-sm">
                  Status: <strong className={t.status === "completed" ? "text-emerald-700" : "text-amber-700"}>{t.status.toUpperCase()}</strong>
                </p>

                {t.status === "payment_simulated" && (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <label className="mb-2 block text-sm font-semibold">Verify Buyer Transaction</label>
                    <div className="flex gap-2">
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        value={codes[t.id] ?? ""}
                        onChange={(e) => setCodes((old) => ({ ...old, [t.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                        placeholder="000000"
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 font-mono tracking-widest outline-none focus:border-blue-600"
                      />
                      <button
                        onClick={() => confirmTransaction(t.id)}
                        disabled={(codes[t.id] ?? "").length !== 6}
                        className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                      >
                        Verify Transaction
                      </button>
                    </div>
                  </div>
                )}

                <p className="mt-3 text-sm text-slate-600">
                  Status: <strong>{statusLabel[t.status] ?? t.status}</strong>
                </p>

                {messages[t.id] && <p className="mt-3 text-sm text-slate-600">{messages[t.id]}</p>}
              </article>
            ))}
          </div>
        )}

        {messages.page && <p className="mt-4 text-sm text-red-700">{messages.page}</p>}

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Demo notice: confirming marks the transaction completed in the database. It does not release real money.
        </p>
      </section>
    </main>
  );
}

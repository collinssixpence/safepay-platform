
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Plus, ShieldCheck, RefreshCw } from "lucide-react";
import type { Transaction } from "@/types/transaction";

export default function BuyerDashboard() {
  const router = useRouter();
  const [name, setName] = useState("Buyer");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    setError("");

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
      setError(err instanceof Error ? err.message : "Could not load transactions.");
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
      setName(data.user.user_metadata?.full_name || data.user.email || "Buyer");
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-blue-800">
            SafePay<span className="text-slate-900">.</span>
          </Link>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            <LogOut size={17} /> Log out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Buyer dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Welcome, {name}</h1>
            <p className="mt-2 text-slate-500">Create and track your transaction agreements.</p>
          </div>
          <Link href="/dashboard/buyer/transactions/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800">
            <Plus size={18} /> Make Transaction
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["All transactions", transactions.length],
            ["Pending payment", transactions.filter((t) => t.status === "pending_payment").length],
            ["Completed", transactions.filter((t) => t.status === "completed").length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-extrabold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Your transactions</h2>
            <button onClick={() => { setLoading(true); loadTransactions(); }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

          {loading ? (
            <p className="py-10 text-center text-slate-500">Loading transactions…</p>
          ) : error ? (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="mx-auto text-blue-700" size={36} />
              <h3 className="mt-3 font-bold">No transactions yet</h3>
              <p className="mt-2 text-sm text-slate-500">Create your first transaction agreement to get started.</p>
              <Link href="/dashboard/buyer/transactions/new" className="mt-5 inline-block rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">
                Create transaction
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {transactions.map((t) => (
                <article key={t.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <h3 className="font-bold">{t.item_name || t.item_description}</h3>
                      <p className="mt-1 text-sm text-slate-500">Seller: {t.seller_full_name || t.seller_email}</p>
                      <p className="mt-1 break-all text-xs text-slate-400">ID: {t.id}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-lg font-extrabold">${Number(t.amount).toFixed(2)}</p>
                      <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${t.status === "completed" ? "bg-emerald-100 text-emerald-800" : t.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                        {statusLabel[t.status] ?? t.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/dashboard/buyer/transactions/${t.id}`} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">
                      View details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Demo notice: SafePay currently records transaction status only. No real payment is collected, held, or released.
        </p>
      </section>
    </main>
  );
}

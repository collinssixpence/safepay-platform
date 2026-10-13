
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
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verifying, setVerifying] = useState(false);

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

  async function confirmTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifying(true);
    setVerificationMessage("");
    setVerificationError("");

    try {
      const response = await fetch("/api/transactions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });
      const result = await response.json();

      if (!response.ok) {
        setVerificationError(result.error ?? "Confirmation failed. Check the code and try again.");
        return;
      }

      setVerificationMessage(result.message);
      setVerificationCode("");
      await loadTransactions();
    } catch {
      setVerificationError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  const incomingTransactions = transactions.filter(
    (transaction) => transaction.seller_email.toLowerCase() === email.toLowerCase()
  );

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
        <p className="mt-2 text-slate-500">Signed in as {email}. Verify the buyer’s code only when you are ready to confirm the transaction.</p>

        <section aria-labelledby="verification-heading" className="mt-7 border-y border-slate-200 py-6">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Seller verification</p>
            <h2 id="verification-heading" className="mt-2 text-xl font-bold">Verify Buyer Code</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Only verify a code for a transaction assigned to your seller account, after the agreed handover. Verification moves the transaction to awaiting delivery; it does not complete it or transfer real funds.</p>

            <form onSubmit={confirmTransaction} className="mt-4 space-y-3">
              <label htmlFor="seller-confirmation-code" className="block text-sm font-semibold text-slate-800">10-digit confirmation code</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="seller-confirmation-code"
                  name="confirmation-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  minLength={10}
                  required
                  value={verificationCode}
                  onChange={(event) => {
                    setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 10));
                    setVerificationError("");
                    setVerificationMessage("");
                  }}
                  aria-describedby="seller-code-help"
                  aria-invalid={Boolean(verificationError)}
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-xl tracking-[0.18em] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={verifying || verificationCode.length !== 10}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifying ? "Verifying…" : "Verify code"}
                </button>
              </div>
              <p id="seller-code-help" className="text-xs text-slate-500">The code is checked against transactions assigned to the seller account you are signed into.</p>
              {verificationError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{verificationError}</p>}
              {verificationMessage && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{verificationMessage}</p>}
            </form>
          </div>
        </section>

        <div className="mt-7 flex justify-end">
          <button onClick={() => { setLoading(true); loadTransactions(); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-100">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-center text-slate-500">Loading transactions…</p>
        ) : incomingTransactions.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <ShieldCheck className="mx-auto text-blue-700" size={38} />
            <h2 className="mt-3 text-lg font-bold">No incoming transactions</h2>
            <p className="mt-2 text-sm text-slate-500">Transactions addressed to your registered email will appear here.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {incomingTransactions.map((t) => (
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

                <p className="mt-3 text-sm text-slate-600">
                  Current status: <strong>{statusLabel[t.status] ?? t.status}</strong>
                </p>
              </article>
            ))}
          </div>
        )}

        {messages.page && <p className="mt-4 text-sm text-red-700">{messages.page}</p>}

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Demo notice: payment is simulated only. Seller verification starts the delivery step; the buyer must separately confirm receipt to complete the transaction.
        </p>
      </section>
    </main>
  );
}

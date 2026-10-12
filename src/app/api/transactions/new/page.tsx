
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function NewTransactionPage() {
  const router = useRouter();
  const [sellerEmail, setSellerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [transactionId, setTransactionId] = useState("");

  async function createTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setCode("");
    setTransactionId("");

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_email: sellerEmail,
          item_description: description,
          amount: Number(amount),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not create transaction.");
      }

      setCode(result.confirmation_code);
      setTransactionId(result.transaction.id);
      setSellerEmail("");
      setDescription("");
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-xl">
        <Link href="/dashboard/buyer" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700">
          <ArrowLeft size={17} /> Buyer dashboard
        </Link>

        <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <ShieldCheck size={26} />
          </div>

          <h1 className="text-2xl font-bold">Create a transaction</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Agree on the item and price with the seller first. This MVP records
            the transaction; it does not collect or hold real money.
          </p>

          {code ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-bold text-emerald-900">Transaction created</p>
              <p className="mt-2 text-sm text-emerald-800">
                Keep this code private and give it to the seller only when you
                are ready to confirm the handover.
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Your confirmation code
              </p>
              <p className="my-2 font-mono text-4xl font-extrabold tracking-[0.25em] text-emerald-950">
                {code}
              </p>
              <p className="break-all text-xs text-slate-600">
                Transaction ID: {transactionId}
              </p>
              <button
                onClick={() => router.push("/dashboard/buyer")}
                className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800"
              >
                Go to dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={createTransaction} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">Seller’s registered email</label>
                <input
                  type="email"
                  required
                  value={sellerEmail}
                  onChange={(e) => setSellerEmail(e.target.value)}
                  placeholder="seller@example.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">What are you buying?</label>
                <input
                  required
                  maxLength={160}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Used Samsung phone"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Agreed price (USD)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max="10000000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50.00"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {busy ? "Creating..." : "Create demo transaction"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

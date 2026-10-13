"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, Copy, RefreshCw } from "lucide-react";
import type { Transaction } from "@/types/transaction";

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

export default function BuyerTransactionDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [actionError, setActionError] = useState("");
    const [confirmationCode, setConfirmationCode] = useState("");
    const [codeExpiry, setCodeExpiry] = useState("");
    const [copyMessage, setCopyMessage] = useState("Copy code");
    const [currentTime, setCurrentTime] = useState(0);

    const loadTransaction = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/transactions", { cache: "no-store" });
            const result = await response.json();

            if (response.status === 401) {
                router.replace("/auth");
                return;
            }

            if (!response.ok) throw new Error(result.error ?? "Could not load transaction details.");

            const match = (result.transactions ?? []).find((entry: Transaction) => entry.id === params.id);

            if (!match) {
                throw new Error("Transaction not found.");
            }

            setTransaction(match);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load transaction details.");
        } finally {
            setLoading(false);
        }
    }, [params.id, router]);

    useEffect(() => {
        let isMounted = true;

        const runner = async () => {
            await loadTransaction();
            if (!isMounted) return;
        };

        void runner();

        return () => {
            isMounted = false;
        };
    }, [loadTransaction]);

    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    async function confirmReceipt() {
        if (!transaction) return;
        setBusy(true);
        setActionError("");

        try {
            const response = await fetch(`/api/transactions/${transaction.id}/receipt`, {
                method: "POST",
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error ?? "Could not confirm receipt.");
            }

            setTransaction(result.transaction);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : "Could not confirm receipt.");
        } finally {
            setBusy(false);
        }
    }

    async function generateNewCode() {
        if (!transaction) return;
        setRegenerating(true);
        setActionError("");
        setConfirmationCode("");

        try {
            const response = await fetch(`/api/transactions/${transaction.id}/confirmation-code`, {
                method: "POST",
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error ?? "Could not generate a new code.");
            }

            setConfirmationCode(result.confirmation_code);
            setCodeExpiry(result.expires_at);
            setTransaction((current) => current
                ? { ...current, confirmation_code_expires_at: result.expires_at }
                : current);
            setCurrentTime(Date.now());
        } catch (err) {
            setActionError(err instanceof Error ? err.message : "Could not generate a new code.");
        } finally {
            setRegenerating(false);
        }
    }

    async function copyCode() {
        if (!confirmationCode) return;
        try {
            await navigator.clipboard.writeText(confirmationCode);
            setCopyMessage("Copied");
        } catch {
            setCopyMessage("Copy failed");
        }
    }

    const expiry = codeExpiry || transaction?.confirmation_code_expires_at || "";
    const expiryTime = expiry ? Date.parse(expiry) : Number.NaN;
    const codeExpired = !Number.isFinite(expiryTime) || expiryTime <= currentTime;
    const canGenerateCode = transaction
        && (transaction.status === "pending_payment" || transaction.status === "payment_simulated");

    if (loading) {
        return <main className="min-h-screen bg-slate-50 p-6 text-slate-900"><p className="text-center text-slate-500">Loading transaction details…</p></main>;
    }

    if (error || !transaction) {
        return (
            <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
                <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-6">
                    <CircleAlert className="text-red-600" />
                    <h1 className="mt-3 text-2xl font-bold">Transaction unavailable</h1>
                    <p className="mt-2 text-sm text-slate-600">{error || "The transaction could not be found."}</p>
                    <Link href="/dashboard/buyer" className="mt-5 inline-block rounded-xl bg-blue-700 px-4 py-3 font-bold text-white">Back to dashboard</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <Link href="/dashboard/buyer" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700">
                        <ArrowLeft size={17} /> Back to dashboard
                    </Link>
                    <button onClick={loadTransaction} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                        <RefreshCw size={15} /> Refresh
                    </button>
                </div>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Transaction details</p>
                            <h1 className="mt-2 text-3xl font-extrabold">{transaction.item_name}</h1>
                        </div>
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
                            {statusLabel[transaction.status] ?? transaction.status}
                        </span>
                    </div>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h2 className="text-lg font-bold">Agreement summary</h2>
                            <dl className="mt-4 space-y-3 text-sm text-slate-600">
                                <div className="flex justify-between gap-3"><dt>Seller</dt><dd className="font-semibold text-slate-900">{transaction.seller_full_name}</dd></div>
                                <div className="flex justify-between gap-3"><dt>Contact</dt><dd className="font-semibold text-slate-900">{transaction.seller_phone}</dd></div>
                                <div className="flex justify-between gap-3"><dt>Payment method</dt><dd className="font-semibold text-slate-900">{transaction.payment_method}</dd></div>
                                <div className="flex justify-between gap-3"><dt>Amount</dt><dd className="font-semibold text-slate-900">${Number(transaction.amount).toFixed(2)}</dd></div>
                                <div className="flex justify-between gap-3"><dt>Reference</dt><dd className="font-mono text-xs font-semibold text-slate-900 break-all">{transaction.id}</dd></div>
                            </dl>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h2 className="text-lg font-bold">Status and next steps</h2>
                            <p className="mt-4 text-sm text-slate-600">{transaction.item_description}</p>

                            {(transaction.status === "pending_payment" || transaction.status === "payment_simulated") && (
                                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                                    <h3 className="font-bold text-slate-900">Buyer confirmation code</h3>
                                    {expiry ? (
                                        <p className="mt-2 text-sm text-slate-700">
                                            {codeExpired
                                                ? "The current code has expired."
                                                : `Code expires ${new Date(expiry).toLocaleString()} (${Math.ceil((expiryTime - currentTime) / 60000)} min remaining).`}
                                            <span className="mt-1 block text-xs text-slate-500">The server checks expiry when the seller verifies the code.</span>
                                        </p>
                                    ) : (
                                        <p className="mt-2 text-sm text-slate-700">A new code is available for this transaction.</p>
                                    )}

                                    {confirmationCode && (
                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-white p-3">
                                            <span aria-label="Ten-digit buyer confirmation code" className="font-mono text-2xl font-extrabold tracking-[0.18em] text-blue-800">{confirmationCode}</span>
                                            <button type="button" onClick={copyCode} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                                                <Copy size={15} /> <span aria-live="polite">{copyMessage}</span>
                                            </button>
                                        </div>
                                    )}

                                    <p className="mt-3 text-sm text-slate-700">Share this code with your seller only when you are ready to confirm the transaction.</p>
                                    {canGenerateCode && (
                                        <button
                                            type="button"
                                            onClick={generateNewCode}
                                            disabled={regenerating || !codeExpired}
                                            className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {regenerating ? "Generating new code…" : "Generate New Code"}
                                        </button>
                                    )}
                                </div>
                            )}

                            {actionError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}

                            {transaction.status === "awaiting_delivery" && (
                                <button
                                    type="button"
                                    onClick={confirmReceipt}
                                    disabled={busy}
                                    className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
                                >
                                    {busy ? "Confirming receipt..." : "Confirm receipt and complete transaction"}
                                </button>
                            )}

                            {transaction.status === "completed" && (
                                <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                                    <CheckCircle2 size={18} /> Transaction completed successfully.
                                </div>
                            )}

                            {transaction.status === "cancelled" && (
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                                    This transaction was cancelled.
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

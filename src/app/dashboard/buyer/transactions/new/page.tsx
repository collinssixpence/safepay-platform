"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, CreditCard, ShieldCheck } from "lucide-react";

const PAYMENT_METHODS = ["EcoCash", "InnBucks", "Omari"];

type PaymentStage = "form" | "payment" | "success" | "cancelled";

type TransactionDraft = {
    seller_email: string;
    seller_full_name: string;
    seller_phone: string;
    item_name: string;
    item_description: string;
    amount: string;
    payment_method: string;
};

type TransactionRecord = {
    id: string;
    status: string;
    amount: number;
    item_name: string;
    item_description: string;
    seller_email: string;
    seller_full_name: string;
    seller_phone: string;
    payment_method: string;
};

const initialDraft: TransactionDraft = {
    seller_email: "",
    seller_full_name: "",
    seller_phone: "",
    item_name: "",
    item_description: "",
    amount: "",
    payment_method: "EcoCash",
};

export default function NewBuyerTransactionPage() {
    const router = useRouter();
    const [draft, setDraft] = useState<TransactionDraft>(initialDraft);
    const [stage, setStage] = useState<PaymentStage>("form");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [transaction, setTransaction] = useState<TransactionRecord | null>(null);
    const [confirmationCode, setConfirmationCode] = useState("");
    const [copyState, setCopyState] = useState("Copy code");

    const summaryAmount = useMemo(() => {
        const parsed = Number(draft.amount || 0);
        return Number.isFinite(parsed) ? parsed : 0;
    }, [draft.amount]);

    function updateField(field: keyof TransactionDraft, value: string) {
        setDraft((current) => ({ ...current, [field]: value }));
        setError("");
    }

    async function createTransaction(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    seller_email: draft.seller_email,
                    seller_full_name: draft.seller_full_name,
                    seller_phone: draft.seller_phone,
                    item_name: draft.item_name,
                    item_description: draft.item_description,
                    amount: Number(draft.amount),
                    payment_method: draft.payment_method,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error ?? "Could not create the transaction.");
            }

            setTransaction(result.transaction);
            setStage("payment");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    }

    async function submitSimulatedPayment(success: boolean) {
        if (!transaction) return;

        setSubmitting(true);
        setError("");

        try {
            const response = await fetch(`/api/transactions/${transaction.id}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: success ? "success" : "cancelled" }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error ?? "The simulated payment action failed.");
            }

            if (success) {
                setConfirmationCode(result.code ?? "");
                setStage("success");
            } else {
                setStage("cancelled");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not process the simulated payment.");
        } finally {
            setSubmitting(false);
        }
    }

    async function copyCode() {
        if (!confirmationCode) return;

        try {
            await navigator.clipboard.writeText(confirmationCode);
            setCopyState("Copied");
            window.setTimeout(() => setCopyState("Copy code"), 1500);
        } catch {
            setCopyState("Copy failed");
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
            <div className="mx-auto max-w-6xl">
                <Link href="/dashboard/buyer" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700">
                    <ArrowLeft size={17} /> Back to buyer dashboard
                </Link>

                <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                <ShieldCheck size={26} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Protected transaction</p>
                                <h1 className="mt-1 text-2xl font-extrabold">Create a SafePay transaction</h1>
                            </div>
                        </div>

                        {stage === "form" && (
                            <form onSubmit={createTransaction} className="space-y-5">
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-semibold">Seller&apos;s full name</label>
                                        <input
                                            required
                                            value={draft.seller_full_name}
                                            onChange={(e) => updateField("seller_full_name", e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                            placeholder="John Moyo"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold">Seller phone / contact</label>
                                        <input
                                            required
                                            value={draft.seller_phone}
                                            onChange={(e) => updateField("seller_phone", e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                            placeholder="+263 77 123 4567"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold">Seller email</label>
                                        <input
                                            required
                                            type="email"
                                            value={draft.seller_email}
                                            onChange={(e) => updateField("seller_email", e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                            placeholder="seller@example.com"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-semibold">Product or service name</label>
                                        <input
                                            required
                                            value={draft.item_name}
                                            onChange={(e) => updateField("item_name", e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                            placeholder="Used laptop, home appliance, service package"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-semibold">Transaction description</label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={draft.item_description}
                                            onChange={(e) => updateField("item_description", e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                            placeholder="Describe the goods or service, condition, delivery terms, and agreed details."
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold">Amount in USD</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={draft.amount}
                                            onChange={(e) => updateField("amount", e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                            placeholder="275.00"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold">Payment method</label>
                                        <select
                                            value={draft.payment_method}
                                            onChange={(e) => updateField("payment_method", e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                        >
                                            {PAYMENT_METHODS.map((method) => (
                                                <option key={method} value={method}>{method}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? "Creating transaction..." : "Continue to Payment"}
                                </button>
                            </form>
                        )}

                        {stage === "payment" && transaction && (
                            <div className="space-y-5">
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                    <div className="flex items-center gap-2 font-bold">
                                        <CreditCard size={18} /> DEMO / SIMULATED PAYMENT
                                    </div>
                                    <p className="mt-2">This screen is a demo payment flow only. No real payment provider is connected, and no real payment PIN, OTP, or bank credentials are collected.</p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Payment summary</p>
                                            <h2 className="mt-1 text-xl font-bold">{transaction.item_name}</h2>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">Amount</p>
                                            <p className="text-2xl font-extrabold text-blue-800">${Number(transaction.amount).toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                                        <div className="flex justify-between gap-3"><span>Seller</span><span className="font-semibold text-slate-900">{transaction.seller_full_name}</span></div>
                                        <div className="flex justify-between gap-3"><span>Payment method</span><span className="font-semibold text-slate-900">{transaction.payment_method}</span></div>
                                        <div className="flex justify-between gap-3"><span>Status</span><span className="font-semibold text-amber-700">Pending payment</span></div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={() => submitSimulatedPayment(true)}
                                        disabled={submitting}
                                        className="flex-1 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
                                    >
                                        {submitting ? "Processing..." : "Simulate Successful Payment"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => submitSimulatedPayment(false)}
                                        disabled={submitting}
                                        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                                    >
                                        Simulate Failed Payment
                                    </button>
                                </div>
                            </div>
                        )}

                        {stage === "success" && transaction && (
                            <div className="space-y-5">
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                                    <div className="flex items-center gap-2 text-emerald-800">
                                        <CheckCircle2 size={20} />
                                        <span className="font-bold">Payment successful (simulated demo)</span>
                                    </div>
                                    <p className="mt-2 text-sm text-emerald-800">The transaction is now ready for the seller to verify the code.</p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Buyer confirmation code</p>
                                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                                        <span className="font-mono text-3xl font-extrabold tracking-[0.25em] text-blue-800">{confirmationCode}</span>
                                        <button
                                            type="button"
                                            onClick={copyCode}
                                            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
                                        >
                                            <Copy size={16} /> {copyState}
                                        </button>
                                    </div>

                                    <p className="mt-4 text-sm text-slate-600">Share this code with the seller only after the handover is complete. Do not send it in public chat or public URLs.</p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                    <div className="flex justify-between gap-3"><span>Transaction reference</span><span className="font-semibold text-slate-900">{transaction.id}</span></div>
                                    <div className="mt-2 flex justify-between gap-3"><span>Seller</span><span className="font-semibold text-slate-900">{transaction.seller_full_name}</span></div>
                                    <div className="mt-2 flex justify-between gap-3"><span>Amount</span><span className="font-semibold text-slate-900">${Number(transaction.amount).toFixed(2)}</span></div>
                                    <div className="mt-2 flex justify-between gap-3"><span>Payment status</span><span className="font-semibold text-emerald-700">Payment simulated</span></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => router.push("/dashboard/buyer")}
                                    className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800"
                                >
                                    View buyer dashboard
                                </button>
                            </div>
                        )}

                        {stage === "cancelled" && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
                                <h2 className="text-xl font-bold">Payment cancelled</h2>
                                <p className="mt-2 text-sm">The simulated payment was cancelled and the transaction was marked cancelled.</p>
                                <button
                                    type="button"
                                    onClick={() => router.push("/dashboard/buyer")}
                                    className="mt-4 rounded-xl bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-800"
                                >
                                    Return to dashboard
                                </button>
                            </div>
                        )}
                    </section>

                    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Transaction summary</p>
                        <div className="mt-5 space-y-4 text-sm text-slate-600">
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Seller</p>
                                <p className="mt-1 text-base font-semibold text-slate-900">{draft.seller_full_name || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contact</p>
                                <p className="mt-1 text-base font-semibold text-slate-900">{draft.seller_phone || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Product</p>
                                <p className="mt-1 text-base font-semibold text-slate-900">{draft.item_name || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount</p>
                                <p className="mt-1 text-2xl font-extrabold text-blue-800">${summaryAmount.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Payment method</p>
                                <p className="mt-1 text-base font-semibold text-slate-900">{draft.payment_method}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                                <p className="mt-1 text-base font-semibold text-amber-700">{stage === "success" ? "Payment simulated" : "Pending payment"}</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}

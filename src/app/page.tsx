
"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  LockKeyhole,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const benefits = [
    {
      icon: ShoppingBag,
      title: "For buyers",
      description:
        "Record the agreed item, amount, and seller. Track the deal and confirm the handover.",
    },
    {
      icon: Store,
      title: "For sellers",
      description:
        "Review incoming transaction details, verify buyer confirmation codes, and track completion.",
    },
    {
      icon: CircleDollarSign,
      title: "Clear transaction records",
      description:
        "Keep transaction details and status updates together instead of relying only on chat messages.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Create the deal",
      description: "Agree on the item, price, and terms.",
    },
    {
      number: "02",
      title: "Review together",
      description: "Both parties review the transaction details.",
    },
    {
      number: "03",
      title: "Confirm handover",
      description:
        "The buyer shares the confirmation code when the agreed handover occurs.",
    },
    {
      number: "04",
      title: "Complete the deal",
      description:
        "The seller validates the code and the system records completion.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-900">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <ShieldCheck size={25} />
            </span>
            <span>
              <span className="block text-xl font-extrabold tracking-tight">
                Safe<span className="text-blue-600">Pay</span>
              </span>
              <span className="block text-xs text-slate-500">
                Trade with confidence
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#how-it-works" className="hover:text-blue-600">
              How it works
            </a>
            <a href="#benefits" className="hover:text-blue-600">
              Why SafePay
            </a>
            <a href="#get-started" className="hover:text-blue-600">
              Get started
            </a>
          </div>

          <Link
            href="/auth"
            className="hidden items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:flex"
          >
            Log in / Sign up <ArrowRight size={16} />
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 hover:bg-slate-100 md:hidden"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </nav>

        {menuOpen && (
          <div className="grid gap-4 border-t border-slate-200 bg-white px-5 py-5 md:hidden">
            <a
              href="#how-it-works"
              onClick={() => setMenuOpen(false)}
            >
              How it works
            </a>
            <a href="#benefits" onClick={() => setMenuOpen(false)}>
              Why SafePay
            </a>
            <a href="#get-started" onClick={() => setMenuOpen(false)}>
              Get started
            </a>
            <Link
              href="/auth"
              onClick={() => setMenuOpen(false)}
              className="font-semibold text-blue-700"
            >
              Log in / Sign up
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0b1530] text-white">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 md:py-28 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm text-blue-200">
              <ShieldCheck size={17} />
              A smarter way to trade
            </div>

            <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Buy and sell with{" "}
              <span className="text-blue-400">confidence.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Agree on a deal, track every step, and confirm the handover
              with a transaction code. Give both sides more confidence
              when trading online.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth?role=buyer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-4 font-bold text-white transition hover:bg-blue-400"
              >
                Start a transaction <ArrowRight size={19} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-4 font-semibold text-white transition hover:bg-white/10"
              >
                See how it works
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-400" />
                Clear agreements
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-400" />
                Trackable transactions
              </span>
            </div>
          </div>

          {/* Transaction preview */}
          <div className="mx-auto w-full max-w-lg">
            <div className="rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl shadow-black/30 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Transaction overview
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    Your deal, step by step
                  </h2>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <LockKeyhole size={24} />
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">
                      Example transaction
                    </p>
                    <p className="mt-1 font-bold">Laptop purchase</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    Demo
                  </span>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  {[
                    ["01", "Deal agreed", true],
                    ["02", "Handover confirmed", false],
                    ["03", "Transaction completed", false],
                  ].map(([number, label, complete]) => (
                    <div
                      key={String(number)}
                      className="flex gap-3 pb-4 last:pb-0"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                          }`}
                      >
                        {complete ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          String(number)
                        )}
                      </span>
                      <div className="pt-1">
                        <p className="text-sm font-semibold">
                          {String(label)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {complete
                            ? "Agreement recorded"
                            : "Awaiting next step"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Illustrative preview. No real payment is collected or held.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section
        id="benefits"
        className="mx-auto max-w-7xl px-5 py-20 lg:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            Built for both sides
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Less uncertainty. Clearer deals.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            SafePay gives buyers and sellers a shared place to follow the
            agreement and confirm that the handover has happened.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {benefits.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon size={25} />
                </div>
                <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Four straightforward steps.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.number} className="rounded-2xl bg-slate-50 p-6">
                <span className="text-sm font-extrabold text-blue-600">
                  STEP {step.number}
                </span>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
                <ChevronRight className="mt-5 text-blue-600" size={20} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Buyer and seller entry points */}
      <section
        id="get-started"
        className="mx-auto max-w-7xl px-5 py-20 lg:px-8"
      >
        <div className="rounded-3xl bg-blue-600 px-6 py-12 text-white sm:px-12 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              How will you use SafePay?
            </h2>
            <p className="mt-4 leading-7 text-blue-100">
              Choose your role to create an account or log in to your
              dashboard.
            </p>
          </div>

          <div className="mx-auto mt-9 grid max-w-3xl gap-4 sm:grid-cols-2">
            <Link
              href="/auth?role=buyer"
              className="flex items-center gap-4 rounded-2xl bg-white p-5 text-left text-slate-900 transition hover:bg-blue-50"
            >
              <span className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <ShoppingBag size={25} />
              </span>
              <span className="flex-1">
                <span className="block font-bold">I&apos;m a buyer</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Create and track a deal
                </span>
              </span>
              <ArrowRight size={20} />
            </Link>

            <Link
              href="/auth?role=seller"
              className="flex items-center gap-4 rounded-2xl bg-white p-5 text-left text-slate-900 transition hover:bg-blue-50"
            >
              <span className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <Store size={25} />
              </span>
              <span className="flex-1">
                <span className="block font-bold">I&apos;m a seller</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Manage and confirm deals
                </span>
              </span>
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="font-bold text-slate-800">
            Safe<span className="text-blue-600">Pay</span> Zimbabwe
          </p>
          <p>Building more confidence into everyday transactions.</p>
          <p>© {currentYear} SafePay</p>
        </div>
      </footer>
    </main>
  );
}

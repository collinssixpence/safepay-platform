
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";

type Role = "buyer" | "seller";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [role, setRole] = useState<Role>("buyer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              role,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (!data.session) {
          setMessage(
            "Account registration submitted. Check your email to confirm your account, then return here to log in."
          );
          setMode("login");
          return;
        }

        router.push(role === "buyer" ? "/dashboard/buyer" : "/dashboard/seller");
        router.refresh();
        return;
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (loginError) throw loginError;

      const profileLookup = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const profileError = profileLookup.error;
      let profile = profileLookup.data;

      if (profileError) {
        console.error("Profile lookup failed during login", {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          userId: data.user.id,
        });
      }

      if (!profile) {
        const recoveredRole = (data.user.user_metadata?.role as Role | undefined) ?? "buyer";
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              full_name: data.user.user_metadata?.full_name ?? data.user.email ?? "",
              role: recoveredRole,
            },
            { onConflict: "id" }
          );

        if (upsertError) {
          console.error("Profile recovery failed during login", {
            code: upsertError.code,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint,
            userId: data.user.id,
          });
          throw new Error("Your profile could not be restored. Please check the Supabase profiles table.");
        }

        const result = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        profile = result.data;
      }

      const userRole = profile?.role;

      if (userRole !== "buyer" && userRole !== "seller") {
        await supabase.auth.signOut();
        throw new Error("Your profile is missing. Register again or check your Supabase profiles table.");
      }

      router.push(userRole === "buyer" ? "/dashboard/buyer" : "/dashboard/seller");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-2xl font-extrabold text-blue-800">
          <ShieldCheck size={28} /> SafePay
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-extrabold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "signup"
              ? "Choose how you want to use SafePay."
              : "Log in to continue to your dashboard."}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className={`rounded-lg py-2 text-sm font-bold ${mode === "signup" ? "bg-white shadow-sm" : "text-slate-500"}`}>
              Sign up
            </button>
            <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }} className={`rounded-lg py-2 text-sm font-bold ${mode === "login" ? "bg-white shadow-sm" : "text-slate-500"}`}>
              Log in
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Full name</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" placeholder="Your full name" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">I want to join as a</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["buyer", "seller"] as Role[]).map((option) => (
                      <button key={option} type="button" onClick={() => setRole(option)} className={`rounded-xl border p-3 font-semibold capitalize ${role === option ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-300"}`}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold">Email address</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" placeholder="you@example.com" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Password</label>
              <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" placeholder="At least 8 characters" />
            </div>

            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}

            <button disabled={busy} className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60">
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            SafePay’s current demo records transaction agreements and handover confirmations. It does not process real payments.
          </p>
        </section>

        <p className="mt-5 text-center text-sm text-slate-500">
          <Link href="/" className="font-semibold text-blue-700 hover:underline">Back to home</Link>
        </p>
      </div>
    </main>
  );
}

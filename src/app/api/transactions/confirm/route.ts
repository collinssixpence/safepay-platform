
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
        return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Failed to read seller profile", {
            operation: "profiles.seller.read",
            userId: user.id,
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
        });
        return NextResponse.json({ error: "Could not read your profile." }, { status: 500 });
    }

    if (profile?.role !== "seller") {
        return NextResponse.json({ error: "Only sellers can verify transactions." }, { status: 403 });
    }

    let body: { code?: string };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const code = body.code?.trim();

    if (!/^[0-9]{10}$/.test(code ?? "")) {
        return NextResponse.json(
            { error: "Enter the ten-digit buyer confirmation code." },
            { status: 400 }
        );
    }

    const submittedHash = createHash("sha256").update(code!).digest("hex");
    const { data: result, error: verificationError } = await supabase.rpc(
        "verify_transaction_confirmation_code",
        { p_confirmation_code_hash: submittedHash }
    );

    if (verificationError) {
        console.error("Failed to update transaction after seller verification", {
            operation: "transactions.seller_verification.update",
            userId: user.id,
            code: verificationError.code,
            message: verificationError.message,
            details: verificationError.details,
            hint: verificationError.hint,
        });
        return NextResponse.json({ error: "Could not verify this code. Please try again." }, { status: 500 });
    }

    if (result !== "verified") {
        const errors: Record<string, { error: string; status: number }> = {
            expired: { error: "This confirmation code has expired. Ask the buyer to generate a new one.", status: 410 },
            already_used: { error: "This confirmation code has already been used.", status: 409 },
            ineligible: { error: "This transaction is not eligible for seller verification.", status: 409 },
            invalid: { error: "That code is incorrect or is not assigned to your seller account.", status: 400 },
        };
        const failure = errors[result ?? "invalid"] ?? errors.invalid;
        return NextResponse.json({ error: failure.error }, { status: failure.status });
    }

    return NextResponse.json({
        message:
            "Verification successful. The transaction is now awaiting delivery; the buyer must confirm receipt separately.",
    });
}

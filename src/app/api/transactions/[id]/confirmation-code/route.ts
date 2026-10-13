import { NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Failed to read buyer profile for code regeneration", {
            operation: "transactions.confirmation_code.profile",
            userId: user.id,
            code: profileError.code,
            message: profileError.message,
        });
        return NextResponse.json({ error: "Could not read your profile." }, { status: 500 });
    }

    if (profile?.role !== "buyer") {
        return NextResponse.json({ error: "Only buyers can generate a new confirmation code." }, { status: 403 });
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const confirmationCode = String(randomInt(1000000000, 10000000000));
        const confirmationCodeHash = createHash("sha256").update(confirmationCode).digest("hex");
        const { data, error } = await supabase.rpc(
            "regenerate_transaction_confirmation_code",
            {
                p_transaction_id: id,
                p_confirmation_code_hash: confirmationCodeHash,
            }
        );

        if (error?.code === "23505") continue;

        if (error) {
            console.error("Failed to regenerate transaction confirmation code", {
                operation: "transactions.confirmation_code.regenerate",
                transactionId: id,
                userId: user.id,
                code: error.code,
                message: error.message,
            });
            return NextResponse.json({ error: "Could not generate a new code. Please try again." }, { status: 500 });
        }

        const result = Array.isArray(data) ? data[0] : null;

        if (result?.outcome === "generated") {
            return NextResponse.json({
                message: "A new confirmation code was generated. The previous code is now invalid.",
                confirmation_code: confirmationCode,
                expires_at: result.expires_at,
            });
        }

        if (result?.outcome === "not_expired") {
            return NextResponse.json({ error: "Your current code has not expired yet." }, { status: 409 });
        }

        if (result?.outcome === "ineligible") {
            return NextResponse.json({ error: "This transaction is no longer eligible for a new code." }, { status: 409 });
        }

        return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }

    return NextResponse.json(
        { error: "A unique confirmation code could not be generated. Please try again." },
        { status: 503 }
    );
}
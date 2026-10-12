
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
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

    let body: { transaction_id?: string; code?: string };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const transactionId = body.transaction_id;
    const code = body.code?.trim();

    if (!transactionId || !/^[0-9]{6}$/.test(code ?? "")) {
        return NextResponse.json(
            { error: "Enter the transaction ID and the six-digit buyer code." },
            { status: 400 }
        );
    }

    const { data: transaction, error: readError } = await supabase
        .from("transactions")
        .select(
            "id,seller_email,status,confirmation_code_hash,confirmation_code_redeemed_at,seller_confirmed_at"
        )
        .eq("id", transactionId)
        .maybeSingle();

    if (readError || !transaction) {
        if (readError) {
            console.error("Failed to read transaction for seller verification", {
                operation: "transactions.seller_verification.read",
                transactionId,
                userId: user.id,
                code: readError.code,
                message: readError.message,
                details: readError.details,
                hint: readError.hint,
            });
        }
        return NextResponse.json(
            { error: "Transaction not found for this seller." },
            { status: 404 }
        );
    }

    if (transaction.seller_email.toLowerCase() !== user.email.toLowerCase()) {
        return NextResponse.json(
            { error: "This transaction is not assigned to your seller account." },
            { status: 403 }
        );
    }

    if (transaction.status !== "payment_simulated") {
        return NextResponse.json(
            { error: "This transaction is not awaiting seller verification." },
            { status: 409 }
        );
    }

    if (transaction.confirmation_code_redeemed_at) {
        return NextResponse.json(
            { error: "This confirmation code has already been redeemed." },
            { status: 409 }
        );
    }

    if (!transaction.confirmation_code_hash) {
        return NextResponse.json(
            { error: "This transaction does not have a valid confirmation code yet." },
            { status: 400 }
        );
    }

    const submittedHash = createHash("sha256").update(code!).digest();
    const savedHash = Buffer.from(transaction.confirmation_code_hash, "hex");

    if (
        submittedHash.length !== savedHash.length ||
        !timingSafeEqual(submittedHash, savedHash)
    ) {
        return NextResponse.json({ error: "Incorrect confirmation code." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
        .from("transactions")
        .update({
            status: "awaiting_delivery",
            seller_confirmed_at: now,
            confirmation_code_redeemed_at: now,
            updated_at: now,
        })
        .eq("id", transaction.id)
        .eq("status", "payment_simulated")
        .select(
            "id,status,seller_confirmed_at,confirmation_code_redeemed_at,updated_at,amount,item_name,item_description,seller_email,seller_full_name,payment_method"
        )
        .maybeSingle();

    if (updateError || !updated) {
        if (updateError) {
            console.error("Failed to update transaction after seller verification", {
                operation: "transactions.seller_verification.update",
                transactionId,
                userId: user.id,
                code: updateError.code,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
            });
        }
        return NextResponse.json(
            { error: "This code may already be redeemed or the transaction is no longer valid." },
            { status: 409 }
        );
    }

    return NextResponse.json({
        message:
            "Verification successful. The buyer has been notified and the transaction is now awaiting delivery.",
        transaction: updated,
    });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
    request: Request,
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

    let body: { action?: string };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const action = body.action;

    if (action !== "success" && action !== "cancelled") {
        return NextResponse.json({ error: "Invalid payment action." }, { status: 400 });
    }

    const { data: transaction, error: readError } = await supabase
        .from("transactions")
        .select(
            "id,buyer_id,seller_email,seller_full_name,seller_phone,item_name,item_description,amount,payment_method,status"
        )
        .eq("id", id)
        .maybeSingle();

    if (readError || !transaction) {
        if (readError) {
            console.error("Failed to read transaction for simulated payment", {
                operation: "transactions.payment.read",
                transactionId: id,
                code: readError.code,
                message: readError.message,
                details: readError.details,
                hint: readError.hint,
            });
        }
        return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }

    if (transaction.buyer_id !== user.id) {
        return NextResponse.json({ error: "You can only pay your own transactions." }, { status: 403 });
    }

    if (transaction.status !== "pending_payment") {
        return NextResponse.json(
            { error: "This transaction is no longer awaiting a simulated payment." },
            { status: 409 }
        );
    }

    if (action === "cancelled") {
        const now = new Date().toISOString();
        const { data: updated, error: updateError } = await supabase
            .from("transactions")
            .update({
                status: "cancelled",
                cancelled_at: now,
                updated_at: now,
            })
            .eq("id", id)
            .select("id,status,amount,item_name,payment_method,created_at,cancelled_at")
            .maybeSingle();

        if (updateError || !updated) {
            if (updateError) {
                console.error("Failed to cancel transaction", {
                    operation: "transactions.payment.cancel",
                    transactionId: id,
                    code: updateError.code,
                    message: updateError.message,
                    details: updateError.details,
                    hint: updateError.hint,
                });
            }
            return NextResponse.json({ error: "Could not cancel the transaction." }, { status: 500 });
        }

        return NextResponse.json({
            message: "Simulated payment was cancelled. The transaction was marked cancelled.",
            transaction: updated,
        });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
        .from("transactions")
        .update({
            status: "payment_simulated",
            payment_confirmed_at: now,
            updated_at: now,
        })
        .eq("id", id)
        .eq("status", "pending_payment")
        .select(
            "id,status,amount,currency,payment_method,item_name,item_description,seller_email,seller_full_name,seller_phone,payment_confirmed_at,updated_at"
        )
        .maybeSingle();

    if (updateError || !updated) {
        if (updateError) {
            console.error("Failed to confirm simulated payment", {
                operation: "transactions.payment.confirm",
                transactionId: id,
                code: updateError.code,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
            });
        }
        return NextResponse.json(
            { error: "The payment could not be confirmed. Please refresh and try again." },
            { status: updateError ? 500 : 409 }
        );
    }

    return NextResponse.json({
        message: "DEMO / SIMULATED PAYMENT SUCCESSFUL. The payment has been marked as successful in the app.",
        transaction: updated,
    });
}

import { NextResponse } from "next/server";
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

    const { data: transaction, error: readError } = await supabase
        .from("transactions")
        .select(
            "id,buyer_id,status,item_name,item_description,amount,payment_method,seller_email,seller_full_name,seller_phone,updated_at,completed_at"
        )
        .eq("id", id)
        .maybeSingle();

    if (readError || !transaction) {
        if (readError) {
            console.error("Failed to read transaction for receipt confirmation", {
                operation: "transactions.receipt.read",
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
        return NextResponse.json({ error: "You can only confirm your own transactions." }, { status: 403 });
    }

    if (transaction.status !== "awaiting_delivery") {
        return NextResponse.json(
            { error: "The transaction must be waiting for delivery confirmation before completion." },
            { status: 409 }
        );
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
        .from("transactions")
        .update({
            status: "completed",
            buyer_received_at: now,
            completed_at: now,
            updated_at: now,
        })
        .eq("id", id)
        .eq("status", "awaiting_delivery")
        .select(
            "id,buyer_id,status,item_name,item_description,amount,payment_method,seller_email,seller_full_name,seller_phone,completed_at,updated_at"
        )
        .maybeSingle();

    if (updateError || !updated) {
        if (updateError) {
            console.error("Failed to confirm receipt", {
                operation: "transactions.receipt.confirm",
                transactionId: id,
                code: updateError.code,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
            });
        }
        return NextResponse.json(
            { error: "The transaction could not be completed. Please refresh and try again." },
            { status: 500 }
        );
    }

    return NextResponse.json({
        message: "Receipt confirmed. The transaction is completed.",
        transaction: updated,
    });
}

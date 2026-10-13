
import { NextResponse } from "next/server";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PAYMENT_METHODS = new Set(["EcoCash", "InnBucks", "Omari"]);

function logTransactionPostFailure(diagnosticId: string, stage: string, error: unknown) {
    const fields = typeof error === "object" && error !== null
        ? error as Record<string, unknown>
        : {};

    console.error("Transaction POST failed", {
        diagnosticId,
        stage,
        error: {
            name: error instanceof Error ? error.name : fields.name,
            message: error instanceof Error ? error.message : fields.message,
            code: fields.code,
            details: fields.details,
            hint: fields.hint,
        },
    });
}

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }

    const { data, error } = await supabase
        .from("transactions")
        .select(
            "id,buyer_id,seller_email,seller_full_name,seller_phone,item_name,item_description,amount,currency,payment_method,status,confirmation_code_expires_at,payment_confirmed_at,seller_confirmed_at,confirmation_code_redeemed_at,buyer_received_at,created_at,updated_at,completed_at,cancelled_at"
        )
        .or(`buyer_id.eq.${user.id},seller_email.eq.${user.email?.toLowerCase() ?? ""}`)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to list transactions", {
            operation: "transactions.list",
            userId: user.id,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
        });
        return NextResponse.json({ error: "Could not load transactions. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ transactions: data ?? [] });
}

export async function POST(request: Request) {
    const diagnosticId = randomUUID();
    let stage = "initialize Supabase client";

    try {
        const supabase = await createClient();
        stage = "authenticate request";
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Please log in." }, { status: 401 });
        }

        stage = "read buyer profile";
        const profileLookup = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        const profileError = profileLookup.error;
        let profile = profileLookup.data;

        if (profileError) {
            logTransactionPostFailure(diagnosticId, stage, profileError);
            return NextResponse.json(
                { error: `Could not read your profile. Please try again. Reference: ${diagnosticId}` },
                { status: 500 }
            );
        }

        if (!profile) {
            const recoveredRole = (user.user_metadata?.role as "buyer" | "seller" | undefined) ?? "buyer";
            stage = "recover buyer profile";
            const { error: upsertError } = await supabase
                .from("profiles")
                .upsert(
                    {
                        id: user.id,
                        full_name: user.user_metadata?.full_name ?? user.email ?? "",
                        role: recoveredRole,
                    },
                    { onConflict: "id" }
                );

            if (upsertError) {
                logTransactionPostFailure(diagnosticId, stage, upsertError);
                return NextResponse.json(
                    { error: `Your buyer profile could not be recovered. Please contact support. Reference: ${diagnosticId}` },
                    { status: 500 }
                );
            }

            stage = "verify recovered buyer profile";
            const recoveredProfileResult = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();

            if (recoveredProfileResult.error) {
                logTransactionPostFailure(diagnosticId, stage, recoveredProfileResult.error);
                return NextResponse.json(
                    { error: `Could not verify your buyer profile. Reference: ${diagnosticId}` },
                    { status: 500 }
                );
            }

            profile = recoveredProfileResult.data;
        }

        if (profile?.role !== "buyer") {
            return NextResponse.json(
                { error: "Only buyer accounts can create transactions." },
                { status: 403 }
            );
        }

        let body: {
            seller_email?: string;
            seller_full_name?: string;
            seller_phone?: string;
            item_name?: string;
            item_description?: string;
            amount?: number;
            payment_method?: string;
        };

        stage = "parse and validate transaction request";
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
        }

        const sellerEmail = body.seller_email?.trim().toLowerCase();
        const sellerFullName = body.seller_full_name?.trim();
        const sellerPhone = body.seller_phone?.trim();
        const itemName = body.item_name?.trim();
        const itemDescription = body.item_description?.trim();
        const paymentMethod = body.payment_method?.trim();
        const amount = Number(body.amount);

        if (
            !sellerEmail ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sellerEmail) ||
            !sellerFullName ||
            sellerFullName.length < 2 ||
            !sellerPhone ||
            sellerPhone.length < 7 ||
            !itemName ||
            itemName.length < 2 ||
            !itemDescription ||
            itemDescription.length < 4 ||
            itemDescription.length > 500 ||
            !PAYMENT_METHODS.has(paymentMethod ?? "") ||
            !Number.isFinite(amount) ||
            amount <= 0 ||
            amount > 10000000
        ) {
            return NextResponse.json(
                {
                    error:
                        "Enter a valid seller email, full name, phone, item name, description, amount, and payment method.",
                },
                { status: 400 }
            );
        }

        if (sellerEmail === user.email?.toLowerCase()) {
            return NextResponse.json(
                { error: "You cannot create a transaction with your own email." },
                { status: 400 }
            );
        }

        stage = "insert transaction";
        let data;
        let error;
        let confirmationCode = "";

        for (let attempt = 0; attempt < 5; attempt += 1) {
            confirmationCode = String(randomInt(1000000000, 10000000000));
            const confirmationCodeHash = createHash("sha256").update(confirmationCode).digest("hex");
            const result = await supabase
                .from("transactions")
                .insert({
                    buyer_id: user.id,
                    seller_email: sellerEmail,
                    seller_full_name: sellerFullName,
                    seller_phone: sellerPhone,
                    item_name: itemName,
                    item_description: itemDescription,
                    amount: Math.round(amount * 100) / 100,
                    currency: "USD",
                    payment_method: paymentMethod,
                    status: "pending_payment",
                    confirmation_code_hash: confirmationCodeHash,
                })
                .select(
                    "id,buyer_id,seller_email,seller_full_name,seller_phone,item_name,item_description,amount,currency,payment_method,status,confirmation_code_expires_at,created_at,updated_at,completed_at,cancelled_at"
                )
                .single();

            if (result.error?.code === "23505") continue;
            data = result.data;
            error = result.error;
            break;
        }

        if (!data && !error) {
            return NextResponse.json(
                { error: "A unique confirmation code could not be generated. Please try again." },
                { status: 503 }
            );
        }

        if (error) {
            logTransactionPostFailure(diagnosticId, stage, error);

            const userMessage = ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code)
                ? "The SafePay transaction schema is out of date. Ask the project administrator to apply the latest Supabase migration."
                : error.code === "42501"
                    ? "Supabase denied this transaction. Check that your buyer account and transaction access policies are configured correctly."
                    : "Could not create the transaction. Please try again or contact support.";

            return NextResponse.json(
                { error: `${userMessage} Reference: ${diagnosticId}` },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                message: "Transaction created. Continue to the simulated payment flow.",
                transaction: data,
                confirmation_code: confirmationCode,
            },
            { status: 201 }
        );
    } catch (error) {
        logTransactionPostFailure(diagnosticId, stage, error);
        return NextResponse.json(
            { error: `Could not create the transaction. Please try again or contact support. Reference: ${diagnosticId}` },
            { status: 500 }
        );
    }
}

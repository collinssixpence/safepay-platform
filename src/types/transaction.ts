
export type TransactionStatus =
    | "pending_payment"
    | "payment_simulated"
    | "seller_confirmed"
    | "awaiting_delivery"
    | "delivered"
    | "completed"
    | "cancelled"
    | "disputed";

export type PaymentMethod = "EcoCash" | "InnBucks" | "Omari";

export type Transaction = {
    id: string;
    buyer_id: string;
    seller_email: string;
    seller_full_name: string;
    seller_phone: string;
    item_name: string;
    item_description: string;
    amount: number;
    currency: string;
    payment_method: PaymentMethod;
    status: TransactionStatus;
    confirmation_code_hash: string | null;
    payment_confirmed_at: string | null;
    seller_confirmed_at: string | null;
    confirmation_code_redeemed_at: string | null;
    buyer_received_at: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    cancelled_at: string | null;
};

export type CreateTransactionInput = {
    seller_email: string;
    seller_full_name: string;
    seller_phone: string;
    item_name: string;
    item_description: string;
    amount: number;
    payment_method: PaymentMethod;
    currency?: "USD";
};

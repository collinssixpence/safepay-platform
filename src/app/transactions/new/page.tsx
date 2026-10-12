import { redirect } from "next/navigation";

export default function LegacyTransactionRedirectPage() {
    redirect("/dashboard/buyer/transactions/new");
}


"use client";

import { redirect } from "next/navigation";

export default function NewTransactionPage() {
  redirect("/dashboard/buyer/transactions/new");
}

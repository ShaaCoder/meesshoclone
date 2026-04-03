"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";


/* ============================= */
/* 💰 REQUEST WITHDRAW */
/* ============================= */
export async function requestWithdraw(formData: FormData): Promise<void> {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const amount = Number(formData.get("amount"));

  if (!amount || amount <= 0) {
    throw new Error("Invalid amount");
  }

  /* 🔥 CHECK BANK VERIFIED */
  const { data: bank } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("reseller_id", user.id)
    .single();

  if (!bank) {
    throw new Error("Add bank details first");
  }

  if (!bank.is_verified) {
    throw new Error("Bank not verified by admin");
  }

  /* 💰 CHECK WALLET */
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("reseller_id", user.id)
    .single();

  if (!wallet || wallet.balance < amount) {
    throw new Error("Insufficient balance");
  }

  /* ❌ PREVENT MULTIPLE PENDING */
  const { data: existing } = await supabase
    .from("withdraw_requests")
    .select("*")
    .eq("reseller_id", user.id)
    .eq("status", "pending");

  if (existing && existing.length > 0) {
    throw new Error("You already have a pending request");
  }

  /* ✅ CREATE REQUEST */
  await supabase.from("withdraw_requests").insert({
    reseller_id: user.id,
    amount,
    status: "pending",
  });

  return;
}

/* ============================= */
/* 🏦 SAVE BANK DETAILS */
/* ============================= */
export async function saveBankDetails(userId: string, data: any) {
  if (!userId) throw new Error("Unauthorized");

  if (!data.accountNumber || !data.ifsc || !data.name) {
    throw new Error("Missing bank details");
  }

  await supabaseAdmin.from("bank_accounts").upsert({
    reseller_id: userId,
    account_holder_name: data.name,
    account_number: data.accountNumber,
    ifsc_code: data.ifsc,
    bank_name: data.bankName || "",
    upi_id: data.upi || "",
    is_verified: false, // 🔥 always false on update
  });
}

export async function saveBankDetailsAction(formData: FormData) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  await saveBankDetails(user.id, {
    name: formData.get("name"),
    accountNumber: formData.get("accountNumber"),
    ifsc: formData.get("ifsc"),
    bankName: formData.get("bankName"),
    upi: formData.get("upi"),
  });
}
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

  /* 🏦 CHECK BANK */
  const { data: bank } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("seller_id", user.id)
    .single();

  if (!bank || !bank.is_verified) {
    throw new Error("Bank not verified");
  }

  /* 💰 GET WALLET */
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("seller_id", user.id)
    .single();

  if (!wallet) throw new Error("Wallet not found");

  const availableBalance = wallet.balance - wallet.locked_balance;

  if (availableBalance < amount) {
    throw new Error("Insufficient balance");
  }

  /* ❌ PREVENT MULTIPLE */
  const { data: existing } = await supabase
    .from("withdraw_requests")
    .select("*")
    .eq("seller_id", user.id)
    .eq("status", "pending");

  if (existing?.length) {
    throw new Error("Pending request exists");
  }

  /* ✅ CREATE REQUEST */
  const { data: withdraw } = await supabase
    .from("withdraw_requests")
    .insert({
      seller_id: user.id,
      amount,
      status: "pending",
    })
    .select()
    .single();

  /* 🔒 LOCK BALANCE */
  await supabase
    .from("wallets")
    .update({
      locked_balance: wallet.locked_balance + amount,
    })
    .eq("seller_id", user.id);

  /* 📜 LEDGER ENTRY */
  await supabase.from("wallet_transactions").insert({
    seller_id: user.id,
    type: "lock",
    amount,
    reference_id: withdraw.id,
    note: "Withdraw request lock",
  });
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
    seller_id: userId,
    account_holder_name: data.name,
    account_number: data.accountNumber,
    ifsc_code: data.ifsc,
    bank_name: data.bankName || "",
    upi_id: data.upi || "",
    is_verified: false,
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
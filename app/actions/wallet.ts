"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";

import { revalidatePath } from "next/cache";
import {
  holdWithdrawAmount,
  approveWithdrawRequest,
  rejectWithdrawRequest,
} from "@/services/wallet-engine";

/* =========================================================
   💰 GET WALLET
========================================================= */

export async function getWallet() {
  const supabase =
    await getSupabaseServer();

  /* =========================================================
     🔐 AUTH
  ========================================================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Unauthorized"
    );
  }

  /* =========================================================
     💰 FETCH WALLET
  ========================================================= */

  const {
    data: wallet,
    error: walletError,
  } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq(
      "seller_id",
      user.id
    )
    .maybeSingle();

  if (walletError) {
    console.error(
      "❌ WALLET FETCH ERROR:",
      walletError
    );

    throw new Error(
      "Failed to fetch wallet"
    );
  }

  /* =========================================================
     🆕 AUTO CREATE WALLET
  ========================================================= */

  if (!wallet) {
    const {
      data: newWallet,
      error: createError,
    } = await supabaseAdmin
      .from("wallets")
      .insert({
        seller_id: user.id,

        balance: 0,

        locked_balance: 0,
      })
      .select()
      .single();

    if (
      createError ||
      !newWallet
    ) {
      console.error(
        "❌ WALLET CREATE ERROR:",
        createError
      );

      throw new Error(
        "Failed to create wallet"
      );
    }

    console.log(
      "✅ WALLET CREATED:",
      newWallet
    );

    return newWallet;
  }

  return wallet;
}

/* =========================================================
   📜 GET TRANSACTIONS
========================================================= */

export async function getTransactions() {
  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Unauthorized"
    );
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("wallet_transactions")
    .select("*")
    .eq(
      "seller_id",
      user.id
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "❌ TRANSACTION FETCH ERROR:",
      error
    );

    throw new Error(
      "Failed to fetch transactions"
    );
  }

  return data || [];
}

/* =========================================================
   💸 REQUEST WITHDRAW
========================================================= */

export async function requestWithdraw(
  formData: FormData
) {
  try {
    const supabase =
      await getSupabaseServer();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "Unauthorized"
      );
    }

    const amount = Number(
      formData.get("amount") || 0
    );

    /* =========================================================
       ✅ VALIDATION
    ========================================================= */

    if (
      !amount ||
      isNaN(amount)
    ) {
      throw new Error(
        "Invalid amount"
      );
    }

    if (amount < 100) {
      throw new Error(
        "Minimum withdraw amount is ₹100"
      );
    }

    /* =========================================================
       🚫 CHECK PENDING REQUEST
    ========================================================= */

    const {
      data: existingRequest,
    } = await supabaseAdmin
      .from("withdraw_requests")
      .select("id")
      .eq(
        "seller_id",
        user.id
      )
      .eq(
        "status",
        "pending"
      )
      .maybeSingle();

    if (existingRequest) {
      throw new Error(
        "You already have a pending withdraw request"
      );
    }

    /* =========================================================
       💰 GET WALLET
    ========================================================= */

    const {
      data: wallet,
      error: walletError,
    } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq(
        "seller_id",
        user.id
      )
      .single();

    if (
      walletError ||
      !wallet
    ) {
      console.error(
        "❌ WALLET ERROR:",
        walletError
      );

      throw new Error(
        "Wallet not found"
      );
    }

    const availableBalance =
      Number(
        wallet.balance || 0
      );

    const lockedBalance =
      Number(
        wallet.locked_balance || 0
      );

    /* =========================================================
       🚫 INSUFFICIENT BALANCE
    ========================================================= */

    if (
      availableBalance <
      amount
    ) {
      throw new Error(
        "Insufficient available balance"
      );
    }

    console.log(
      "💸 WITHDRAW REQUEST:",
      {
        sellerId: user.id,
        amount,
        availableBalance,
        lockedBalance,
      }
    );

    /* =========================================================
       🔒 MOVE AVAILABLE → LOCKED
    ========================================================= */

    await holdWithdrawAmount({
  sellerId: user.id,

  amount,
});

    /* =========================================================
       📝 CREATE REQUEST
    ========================================================= */

    const {
      data: request,
      error: requestError,
    } = await supabaseAdmin
      .from(
        "withdraw_requests"
      )
      .insert({
        seller_id: user.id,

        amount,

        status: "pending",
      })
      .select()
      .single();

    if (
      requestError ||
      !request
    ) {
      console.error(
        "❌ REQUEST ERROR:",
        requestError
      );

      throw new Error(
        "Failed to create withdraw request"
      );
    }

    console.log(
      "✅ WITHDRAW REQUEST CREATED:",
      request.id
    );

    /* =========================================================
       ♻️ REVALIDATE
    ========================================================= */

    revalidatePath(
      "/dashboard/seller/wallet"
    );

    revalidatePath(
      "/dashboard/admin/withdraws"
    );

    return {
      success: true,

      message:
        "Withdraw request submitted successfully",
    };
  } catch (error: any) {
    console.error(
      "❌ WITHDRAW REQUEST ERROR:",
      error
    );

    throw new Error(
      error?.message ||
        "Withdraw request failed"
    );
  }
}

/* =========================================================
   ✅ APPROVE WITHDRAW
========================================================= */

export async function approveWithdraw(
  withdrawId: string
) {
  try {
    if (!withdrawId) {
      throw new Error(
        "Withdraw ID required"
      );
    }

    await approveWithdrawRequest({
      withdrawRequestId:
        withdrawId,
    });

    revalidatePath(
      "/dashboard/seller/wallet"
    );

    revalidatePath(
      "/dashboard/admin/withdraws"
    );

    return {
      success: true,
    };
  } catch (error: any) {
    console.error(
      "❌ APPROVE WITHDRAW ERROR:",
      error
    );

    throw new Error(
      error?.message ||
        "Failed to approve withdraw"
    );
  }
}

/* =========================================================
   ❌ REJECT WITHDRAW
========================================================= */

export async function rejectWithdraw(
  withdrawId: string
) {
  try {
    if (!withdrawId) {
      throw new Error(
        "Withdraw ID required"
      );
    }

    await rejectWithdrawRequest({
      withdrawRequestId:
        withdrawId,
    });

    revalidatePath(
      "/dashboard/seller/wallet"
    );

    revalidatePath(
      "/dashboard/admin/withdraws"
    );

    return {
      success: true,
    };
  } catch (error: any) {
    console.error(
      "❌ REJECT WITHDRAW ERROR:",
      error
    );

    throw new Error(
      error?.message ||
        "Failed to reject withdraw"
    );
  }
}

/* =========================================================
   🏦 SAVE BANK DETAILS
========================================================= */

export async function saveBankDetails(
  userId: string,
  data: any
) {
  if (!userId) {
    throw new Error(
      "Unauthorized"
    );
  }

  if (
    !data.name ||
    !data.accountNumber ||
    !data.ifsc
  ) {
    throw new Error(
      "Missing required bank details"
    );
  }

  const {
    error,
  } = await supabaseAdmin
    .from("bank_accounts")
    .upsert({
      seller_id: userId,

      account_holder_name:
        String(
          data.name
        ).trim(),

      account_number:
        String(
          data.accountNumber
        ).trim(),

      ifsc_code: String(
        data.ifsc
      ).trim(),

      bank_name: String(
        data.bankName || ""
      ).trim(),

      upi_id: String(
        data.upi || ""
      ).trim(),

      is_verified: false,
    });

  if (error) {
    console.error(
      "❌ BANK SAVE ERROR:",
      error
    );

    throw new Error(
      "Failed to save bank details"
    );
  }

  revalidatePath(
    "/dashboard/seller/wallet"
  );

  return {
    success: true,
  };
}

/* =========================================================
   🏦 SAVE BANK FORM ACTION
========================================================= */

export async function saveBankDetailsAction(
  formData: FormData
) {
  try {
    const supabase =
      await getSupabaseServer();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "Unauthorized"
      );
    }

    await saveBankDetails(
      user.id,
      {
        name:
          formData.get("name"),

        accountNumber:
          formData.get(
            "accountNumber"
          ),

        ifsc:
          formData.get(
            "ifsc"
          ),

        bankName:
          formData.get(
            "bankName"
          ),

        upi:
          formData.get("upi"),
      }
    );

    return {
      success: true,
    };
  } catch (error: any) {
    console.error(
      "❌ SAVE BANK ERROR:",
      error
    );

    throw new Error(
      error?.message ||
        "Failed to save bank details"
    );
  }
}
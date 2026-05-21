"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
/* ============================= */
/* 🧠 TYPES */
/* ============================= */



/* ============================= */
/* 💰 GET WALLET */
/* ============================= */

export async function getWallet() {

  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: wallet } =
    await supabase
      .from("wallets")
      .select("*")
      .eq("seller_id", user.id)
      .maybeSingle();

  return wallet;

}

/* ============================= */
/* 📜 GET TRANSACTIONS */
/* ============================= */

export async function getTransactions() {

  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data } =
    await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", {
        ascending: false,
      });

  return data || [];

}

/* ============================= */
/* 💸 REQUEST WITHDRAW */
/* ============================= */



export async function requestWithdraw(
  formData: FormData
): Promise<void> {

  const supabase =
    await getSupabaseServer();

  /* ============================= */
  /* 🔐 AUTH */
  /* ============================= */

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Unauthorized"
    );
  }

  /* ============================= */
  /* 💰 AMOUNT */
  /* ============================= */

  const amount = Number(
    formData.get("amount")
  );

  if (
    !amount ||
    amount <= 0
  ) {
    throw new Error(
      "Invalid amount"
    );
  }

  /* ============================= */
  /* 🏦 BANK CHECK */
  /* ============================= */

  const {
    data: bank,
    error: bankError,
  } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq(
      "seller_id",
      user.id
    )
    .maybeSingle();

  if (bankError) {
    console.error(
      bankError
    );

    throw new Error(
      "Failed to fetch bank account"
    );
  }

  if (!bank) {
    throw new Error(
      "No bank account found"
    );
  }

  if (!bank.is_verified) {
    throw new Error(
      "Bank account not verified"
    );
  }

  /* ============================= */
  /* 💰 GET WALLET */
  /* ============================= */

  const {
    data: wallet,
    error: walletFetchError,
  } = await supabase
    .from("wallets")
    .select("*")
    .eq(
      "seller_id",
      user.id
    )
    .single();

  if (
    walletFetchError ||
    !wallet
  ) {
    console.error(
      walletFetchError
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
      wallet.locked_balance ||
        0
    );

  /* ============================= */
  /* 🚫 BALANCE CHECK */
  /* ============================= */

  if (
    availableBalance <
    amount
  ) {
    throw new Error(
      "Insufficient balance"
    );
  }

  /* ============================= */
  /* ❌ PENDING CHECK */
  /* ============================= */

  const {
    data: existing,
    error: pendingError,
  } = await supabase
    .from(
      "withdraw_requests"
    )
    .select("id")
    .eq(
      "seller_id",
      user.id
    )
    .eq(
      "status",
      "pending"
    );

  if (pendingError) {
    console.error(
      pendingError
    );

    throw new Error(
      "Failed to check existing requests"
    );
  }

  if (
    existing &&
    existing.length > 0
  ) {
    throw new Error(
      "Pending withdraw request already exists"
    );
  }

  /* ============================= */
  /* ✅ CREATE WITHDRAW REQUEST */
  /* ============================= */

  const {
    data: withdraw,
    error: withdrawError,
  } =
    await supabaseAdmin
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
    withdrawError ||
    !withdraw
  ) {
    console.error(
      withdrawError
    );

    throw new Error(
      "Failed to create withdraw request"
    );
  }

  /* ============================= */
  /* 🔒 LOCK MONEY */
  /* ============================= */

  const {
    error: walletError,
  } =
    await supabaseAdmin
      .from("wallets")
      .update({
        balance:
          availableBalance -
          amount,

        locked_balance:
          lockedBalance +
          amount,
      })
      .eq(
        "seller_id",
        user.id
      );

  if (walletError) {
    console.error(
      walletError
    );

    /* ============================= */
    /* 🚨 ROLLBACK */
    /* ============================= */

    await supabaseAdmin
      .from(
        "withdraw_requests"
      )
      .delete()
      .eq(
        "id",
        withdraw.id
      );

    throw new Error(
      "Failed to lock balance"
    );
  }

  /* ============================= */
  /* 📜 TRANSACTION */
  /* ============================= */

  const {
    error:
      transactionError,
  } =
    await supabaseAdmin
      .from(
        "wallet_transactions"
      )
      .insert({
        seller_id: user.id,

        type: "lock",

        amount,

        reference_id:
          withdraw.id,

        note:
          "Withdraw request created",
      });

  if (
    transactionError
  ) {
    console.error(
      transactionError
    );
  }

  /* ============================= */
  /* 🔄 REVALIDATE */
  /* ============================= */

  revalidatePath(
    "/dashboard/seller/wallet"
  );

  revalidatePath(
    "/dashboard/admin/withdraws"
  );

  return;
}

/* ============================= */
/* ✅ APPROVE WITHDRAW */
/* ============================= */

export async function approveWithdraw(
  withdrawId: string
) {
  /* ============================= */
  /* 📦 GET REQUEST */
  /* ============================= */

  const { data: withdraw } =
    await supabaseAdmin
      .from("withdraw_requests")
      .select("*")
      .eq("id", withdrawId)
      .single();

  if (
    !withdraw ||
    withdraw.status !== "pending"
  ) {
    throw new Error(
      "Invalid withdraw request"
    );
  }

  /* ============================= */
  /* 💰 GET WALLET */
  /* ============================= */

  const { data: wallet } =
    await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq(
        "seller_id",
        withdraw.seller_id
      )
      .single();

  if (!wallet) {
    throw new Error(
      "Wallet not found"
    );
  }

  const withdrawAmount = Number(
    withdraw.amount || 0
  );

  const lockedBalance = Number(
    wallet.locked_balance || 0
  );

  /* ============================= */
  /* 🚫 VALIDATION */
  /* ============================= */

  if (
    lockedBalance <
    withdrawAmount
  ) {
    throw new Error(
      "Insufficient locked balance"
    );
  }

  /* ============================= */
  /* 🔓 REMOVE LOCKED BALANCE */
  /* ============================= */

  const { error: walletError } =
    await supabaseAdmin
      .from("wallets")
      .update({
        locked_balance:
          lockedBalance -
          withdrawAmount,
      })
      .eq(
        "seller_id",
        withdraw.seller_id
      );

  if (walletError) {
    console.error(
      walletError
    );

    throw new Error(
      "Failed to update wallet"
    );
  }

  /* ============================= */
  /* 📜 TRANSACTION */
  /* ============================= */

  await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      seller_id:
        withdraw.seller_id,

      type: "release",

      amount: withdrawAmount,

      reference_id:
        withdraw.id,

      note:
        "Withdraw approved by admin",
    });

  /* ============================= */
  /* ✅ UPDATE REQUEST */
  /* ============================= */

  await supabaseAdmin
    .from("withdraw_requests")
    .update({
      status: "paid",

      processed_at:
        new Date().toISOString(),
    })
    .eq("id", withdrawId);

  revalidatePath(
    "/dashboard/seller/wallet"
  );

  revalidatePath(
    "/dashboard/admin/withdraws"
  );

  return {
    success: true,
  };
}
/* ============================= */
/* ❌ REJECT WITHDRAW */
/* ============================= */

export async function rejectWithdraw(
  withdrawId: string
) {
  /* ============================= */
  /* 📦 GET REQUEST */
  /* ============================= */

  const { data: withdraw } =
    await supabaseAdmin
      .from("withdraw_requests")
      .select("*")
      .eq("id", withdrawId)
      .single();

  if (
    !withdraw ||
    withdraw.status !== "pending"
  ) {
    throw new Error(
      "Invalid withdraw request"
    );
  }

  /* ============================= */
  /* 💰 GET WALLET */
  /* ============================= */

  const { data: wallet } =
    await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq(
        "seller_id",
        withdraw.seller_id
      )
      .single();

  if (!wallet) {
    throw new Error(
      "Wallet not found"
    );
  }

  const lockedBalance = Number(
    wallet.locked_balance || 0
  );

  const withdrawAmount = Number(
    withdraw.amount || 0
  );

  /* ============================= */
  /* 🔓 UNLOCK BALANCE */
  /* ============================= */

  const { error: walletError } =
    await supabaseAdmin
      .from("wallets")
     .update({
  balance:
    Number(wallet.balance || 0) +
    withdrawAmount,

  locked_balance:
    Math.max(
      0,
      lockedBalance -
        withdrawAmount
    ),
})
      .eq(
        "seller_id",
        withdraw.seller_id
      );

  if (walletError) {
    console.error(walletError);

    throw new Error(
      "Failed to unlock balance"
    );
  }

  /* ============================= */
  /* 📜 TRANSACTION */
  /* ============================= */

  await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      seller_id:
        withdraw.seller_id,

      type: "release",

      amount: withdrawAmount,

      reference_id:
        withdraw.id,

      note:
        "Withdraw rejected",
    });

  /* ============================= */
  /* ❌ UPDATE REQUEST */
  /* ============================= */

  await supabaseAdmin
    .from("withdraw_requests")
    .update({
      status: "rejected",
    })
    .eq("id", withdrawId);

  return {
    success: true,
  };
}
/* ============================= */
/* 💰 CREDIT SELLER WALLET */
/* ============================= */

export async function creditSellerWallet({
  sellerId,
  orderId,
  amount,
}: {
  sellerId: string;
  orderId: string;
  amount: number;
}) {

  if (
    !sellerId ||
    !orderId ||
    !amount
  ) {
    throw new Error(
      "Missing params"
    );
  }

  /* ============================= */
  /* 🚫 DOUBLE CREDIT CHECK */
  /* ============================= */

  const { data: existing } =
    await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("reference_id", orderId)
      .eq("type", "credit")
      .maybeSingle();

  if (existing) {
    return;
  }

  /* ============================= */
  /* 💰 GET WALLET */
  /* ============================= */

  const { data: wallet } =
    await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("seller_id", sellerId)
      .maybeSingle();

  if (!wallet) {

    const { error } =
      await supabaseAdmin
        .from("wallets")
        .insert({
          seller_id: sellerId,

          balance: 0,

          locked_balance: amount,
        });

    if (error) {
      console.error(error);

      throw new Error(
        "Failed to create wallet"
      );
    }

  } else {

    const { error } =
      await supabaseAdmin
        .from("wallets")
        .update({
          locked_balance:
            Number(
              wallet.locked_balance || 0
            ) + amount,
        })
        .eq("seller_id", sellerId);

    if (error) {
      console.error(error);

      throw new Error(
        "Failed to update wallet"
      );
    }
  }

  /* ============================= */
  /* 📜 TRANSACTION */
  /* ============================= */

  await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      seller_id: sellerId,

      type: "credit",

      amount,

      reference_id: orderId,

      note:
        "Order earning locked",
    });
}

/* ============================= */
/* 🔓 RELEASE WALLET BALANCE */
/* ============================= */

/* ============================= */
/* 🔓 RELEASE WALLET BALANCE */
/* ============================= */

export async function releaseWalletBalance({
  sellerId,
  orderId,
  amount,
}: {
  sellerId: string;
  orderId: string;
  amount: number;
}) {

  if (
    !sellerId ||
    !orderId ||
    !amount
  ) {
    throw new Error(
      "Missing params"
    );
  }

  /* ============================= */
  /* 🚫 DOUBLE RELEASE CHECK */
  /* ============================= */

  const {
    data: existingRelease,
  } = await supabaseAdmin
    .from(
      "wallet_transactions"
    )
    .select("id")
    .eq("seller_id", sellerId)
    .eq("reference_id", orderId)
    .eq("type", "release")
    .maybeSingle();

  if (existingRelease) {
    return;
  }

  /* ============================= */
  /* 💰 GET WALLET */
  /* ============================= */

  let {
    data: wallet,
  } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq(
      "seller_id",
      sellerId
    )
    .maybeSingle();

  /* ============================= */
  /* 🆕 AUTO CREATE WALLET */
  /* ============================= */

  if (!wallet) {

    const {
      data: newWallet,
      error:
        createWalletError,
    } = await supabaseAdmin
      .from("wallets")
      .insert({
        seller_id: sellerId,

        balance: amount,

        locked_balance: 0,
      })
      .select()
      .single();

    if (
      createWalletError ||
      !newWallet
    ) {
      console.error(
        createWalletError
      );

      throw new Error(
        "Failed to create wallet"
      );
    }

    /* ============================= */
    /* 📜 TRANSACTION */
    /* ============================= */

    await supabaseAdmin
      .from(
        "wallet_transactions"
      )
      .insert({
        seller_id: sellerId,

        type: "release",

        amount,

        reference_id:
          orderId,

        note:
          "Wallet auto-created and payout released",
      });

    return;
  }

  /* ============================= */
  /* 🔓 MOVE LOCKED → AVAILABLE */
  /* ============================= */

  const lockedBalance =
    Number(
      wallet.locked_balance ||
        0
    );

  const availableBalance =
    Number(
      wallet.balance || 0
    );

  const releaseAmount =
    Math.min(
      lockedBalance,
      amount
    );

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("wallets")
    .update({
      balance:
        availableBalance +
        releaseAmount,

      locked_balance:
        Math.max(
          0,
          lockedBalance -
            releaseAmount
        ),
    })
    .eq(
      "seller_id",
      sellerId
    );

  if (updateError) {
    console.error(
      updateError
    );

    throw new Error(
      "Failed to release balance"
    );
  }

  /* ============================= */
  /* 📜 TRANSACTION */
  /* ============================= */

  await supabaseAdmin
    .from(
      "wallet_transactions"
    )
    .insert({
      seller_id: sellerId,

      type: "release",

      amount:
        releaseAmount,

      reference_id:
        orderId,

      note:
        "Seller payout released",
    });
}
/* ============================= */
/* 💸 REFUND SELLER WALLET */
/* ============================= */

export async function refundSellerWallet({
  sellerId,
  orderId,
  amount,
}: {
  sellerId: string;
  orderId: string;
  amount: number;
}) {

  const { data: wallet } =
    await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("seller_id", sellerId)
      .single();

  if (!wallet) {
    throw new Error(
      "Wallet not found"
    );
  }

  const { error } =
    await supabaseAdmin
      .from("wallets")
      .update({
        balance: Math.max(
          0,
          Number(wallet.balance || 0) -
            amount
        ),
      })
      .eq("seller_id", sellerId);

  if (error) {
    console.error(error);

    throw new Error(
      "Failed to refund wallet"
    );
  }

  /* ============================= */
  /* 📜 TRANSACTION */
  /* ============================= */

  await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      seller_id: sellerId,

      type: "debit",

      amount,

      reference_id: orderId,

      note: "Order refunded",
    });
}

/* ============================= */
/* 🏦 SAVE BANK DETAILS */
/* ============================= */

export async function saveBankDetails(
  userId: string,
  data: any
) {

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (
    !data.accountNumber ||
    !data.ifsc ||
    !data.name
  ) {
    throw new Error(
      "Missing bank details"
    );
  }

  await supabaseAdmin
    .from("bank_accounts")
    .upsert({
      seller_id: userId,

      account_holder_name:
        data.name,

      account_number:
        data.accountNumber,

      ifsc_code: data.ifsc,

      bank_name:
        data.bankName || "",

      upi_id: data.upi || "",

      is_verified: false,
    });

}

/* ============================= */
/* 🏦 SAVE BANK FORM ACTION */
/* ============================= */

export async function saveBankDetailsAction(
  formData: FormData
) {

  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  await saveBankDetails(user.id, {
    name: formData.get("name"),

    accountNumber:
      formData.get("accountNumber"),

    ifsc: formData.get("ifsc"),

    bankName:
      formData.get("bankName"),

    upi: formData.get("upi"),
  });

}
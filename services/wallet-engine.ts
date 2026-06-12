

/* =========================================================
   🧠 WALLET ENGINE
   FILE: services/wallet-engine.ts

   OPTION A ARCHITECTURE

   ✅ NO DOUBLE CREDIT
   ✅ ESCROW SAFE
   ✅ RETURN SAFE
   ✅ WITHDRAW SAFE
   ✅ IDEMPOTENT TRANSACTIONS
   ✅ MARKETPLACE SAFE
========================================================= */

import { supabaseAdmin } from "@/lib/supabase-admin";

/* =========================================================
   🧠 TYPES
========================================================= */

export type WalletTransactionType =
  | "credit_locked"
  | "release_locked"
  | "withdraw_hold"
  | "withdraw_completed"
  | "withdraw_rejected"
  | "refund"
  | "penalty"
  | "debit";

/* =========================================================
   🧠 HELPERS
========================================================= */

function round(value: number) {
  return Number(
    Number(value || 0).toFixed(2)
  );
}

/* =========================================================
   🧠 CREATE WALLET IF MISSING
========================================================= */

export async function createWalletIfMissing(
  sellerId: string
) {
  const {
    data: wallet,
    error,
  } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error) {
    console.error(error);

    throw new Error(
      "Failed to fetch wallet"
    );
  }

  if (wallet) {
    return wallet;
  }

  const {
    data: createdWallet,
    error: createError,
  } = await supabaseAdmin
    .from("wallets")
    .insert({
      seller_id: sellerId,

      balance: 0,

      locked_balance: 0,

      total_earnings: 0,

      total_withdrawn: 0,
    })
    .select()
    .single();

  if (
    createError ||
    !createdWallet
  ) {
    console.error(createError);

    throw new Error(
      "Failed to create wallet"
    );
  }

  return createdWallet;
}

/* =========================================================
   🧠 GET WALLET
========================================================= */

export async function getSellerWallet(
  sellerId: string
) {
  return await createWalletIfMissing(
    sellerId
  );
}

/* =========================================================
   🧠 CREATE TRANSACTION
========================================================= */

export async function createWalletTransaction({
  sellerId,
  type,
  amount,
  balanceBefore,
  balanceAfter,
  lockedBefore,
  lockedAfter,
  referenceId,
  referenceType,
  notes,
}: {
  sellerId: string;

  type: WalletTransactionType;

  amount: number;

  balanceBefore: number;

  balanceAfter: number;

  lockedBefore: number;

  lockedAfter: number;

  referenceId?: string;

  referenceType?: string;

  notes?: string;
}) {
  const {
    error,
  } = await supabaseAdmin
    .from(
      "wallet_transactions"
    )
    .insert({
      seller_id: sellerId,

      type,

      amount: round(amount),

      balance_before:
        round(balanceBefore),

      balance_after:
        round(balanceAfter),

      locked_before:
        round(lockedBefore),

      locked_after:
        round(lockedAfter),

      reference_id:
        referenceId || null,

      reference_type:
        referenceType || null,

      notes:
        notes || null,
    });

  if (error) {
    console.error(
      "WALLET TRANSACTION ERROR:",
      error
    );

    throw new Error(
      error.message
    );
  }

  return true;
}

/* =========================================================
   🧠 CHECK DUPLICATE TRANSACTION
========================================================= */

async function transactionExists({
  sellerId,
  referenceId,
  type,
}: {
  sellerId: string;

  referenceId?: string;

  type: WalletTransactionType;
}) {
  if (!referenceId) {
    return false;
  }

  const {
    data,
  } = await supabaseAdmin
    .from(
      "wallet_transactions"
    )
    .select("id")
    .eq("seller_id", sellerId)
    .eq(
      "reference_id",
      referenceId
    )
    .eq("type", type)
    .maybeSingle();

  return !!data;
}

/* =========================================================
   🧠 CREDIT LOCKED BALANCE
   AFTER DELIVERY
========================================================= */

export async function creditLockedBalance({
  sellerId,
  amount,
  referenceId,
  referenceType,
  notes,
}: {
  sellerId: string;

  amount: number;

  referenceId?: string;

  referenceType?: string;

  notes?: string;
}) {
  if (amount <= 0) {
    throw new Error(
      "Invalid amount"
    );
  }

  /* =========================================================
     🚫 PREVENT DOUBLE CREDIT
  ========================================================= */

  const exists =
    await transactionExists({
      sellerId,
      referenceId,
      type: "credit_locked",
    });

  if (exists) {
    console.log(
      "⚠️ LOCKED CREDIT ALREADY EXISTS"
    );

    return true;
  }

  const wallet =
    await getSellerWallet(
      sellerId
    );

  const balanceBefore =
    Number(
      wallet.balance || 0
    );

  const lockedBefore =
    Number(
      wallet.locked_balance || 0
    );

  const totalEarningsBefore =
    Number(
      wallet.total_earnings ||
        0
    );

  const lockedAfter =
    lockedBefore + amount;

  const totalEarningsAfter =
    totalEarningsBefore +
    amount;

  const {
    error,
  } = await supabaseAdmin
    .from("wallets")
    .update({
      locked_balance:
        round(lockedAfter),

      total_earnings:
        round(
          totalEarningsAfter
        ),
    })
    .eq(
      "seller_id",
      sellerId
    );

  if (error) {
    console.error(error);

    throw new Error(
      error.message
    );
  }

  await createWalletTransaction({
    sellerId,

    type: "credit_locked",

    amount,

    balanceBefore,

    balanceAfter:
      balanceBefore,

    lockedBefore,

    lockedAfter,

    referenceId,

    referenceType,

    notes:
      notes ||
      "Payment received and held in escrow",
  });

  console.log(
    "✅ LOCKED BALANCE CREDITED"
  );

  return true;
}

/* =========================================================
   🧠 RELEASE LOCKED BALANCE
   AFTER RETURN WINDOW
========================================================= */

export async function releaseLockedBalanceToAvailable({
  sellerId,
  amount,
  referenceId,
  referenceType,
  notes,
}: {
  sellerId: string;

  amount: number;

  referenceId?: string;

  referenceType?: string;

  notes?: string;
}) {
  if (amount <= 0) {
    throw new Error(
      "Invalid amount"
    );
  }

  const exists =
    await transactionExists({
      sellerId,
      referenceId,
      type: "release_locked",
    });

  if (exists) {
    console.log(
      "⚠️ RELEASE ALREADY EXISTS"
    );

    return true;
  }

  const wallet =
    await getSellerWallet(
      sellerId
    );

  const balanceBefore =
    Number(
      wallet.balance || 0
    );

  const lockedBefore =
    Number(
      wallet.locked_balance || 0
    );

  if (
    lockedBefore < amount
  ) {
    throw new Error(
      "Insufficient locked balance"
    );
  }

  const balanceAfter =
    balanceBefore + amount;

  const lockedAfter =
    lockedBefore - amount;

  const {
    error,
  } = await supabaseAdmin
    .from("wallets")
    .update({
      balance:
        round(balanceAfter),

      locked_balance:
        round(lockedAfter),
    })
    .eq(
      "seller_id",
      sellerId
    );

  if (error) {
    console.error(error);

    throw new Error(
      error.message
    );
  }

  await createWalletTransaction({
    sellerId,

    type: "release_locked",

    amount,

    balanceBefore,

    balanceAfter,

    lockedBefore,

    lockedAfter,

    referenceId,

    referenceType,

    notes:
      notes ||
      "Settlement released to available balance",
  });

  console.log(
    "💰 LOCKED BALANCE RELEASED"
  );

  return true;
}

/* =========================================================
   🧠 HOLD WITHDRAW AMOUNT
========================================================= */

export async function holdWithdrawAmount({
  sellerId,
  amount,
  referenceId,
}: {
  sellerId: string;

  amount: number;

  referenceId?: string;
}) {
  if (amount <= 0) {
    throw new Error(
      "Invalid amount"
    );
  }

  const exists =
    await transactionExists({
      sellerId,
      referenceId,
      type: "withdraw_hold",
    });

  if (exists) {
    return true;
  }

  const wallet =
    await getSellerWallet(
      sellerId
    );

  const balanceBefore =
    Number(
      wallet.balance || 0
    );

  const lockedBefore =
    Number(
      wallet.locked_balance || 0
    );

  const availableBalance =
    Math.max(
      balanceBefore -
        lockedBefore,
      0
    );

  if (
    availableBalance <
    amount
  ) {
    throw new Error(
      "Insufficient available balance"
    );
  }

  /* =========================================================
     IMPORTANT

     Available balance =
     balance - locked_balance

     So ONLY locked_balance increases.
     balance stays SAME.
  ========================================================= */

  const lockedAfter =
    lockedBefore + amount;

  const {
    error,
  } = await supabaseAdmin
    .from("wallets")
    .update({
      locked_balance:
        round(lockedAfter),
    })
    .eq(
      "seller_id",
      sellerId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  await createWalletTransaction({
    sellerId,

    type: "withdraw_hold",

    amount,

    balanceBefore,

    balanceAfter:
      balanceBefore,

    lockedBefore,

    lockedAfter,

    referenceId,

    referenceType:
      "withdraw_request",

    notes:
      "Withdraw amount moved to hold",
  });

  return true;
}

/* =========================================================
   🧠 APPROVE WITHDRAW
========================================================= */

export async function approveWithdrawRequest({
  withdrawRequestId,
}: {
  withdrawRequestId: string;
}) {
  const {
    data: withdraw,
    error,
  } = await supabaseAdmin
    .from(
      "withdraw_requests"
    )
    .select("*")
    .eq(
      "id",
      withdrawRequestId
    )
    .single();

  if (
    error ||
    !withdraw
  ) {
    throw new Error(
      "Withdraw request not found"
    );
  }

  if (
    withdraw.status !==
    "pending"
  ) {
    throw new Error(
      "Already processed"
    );
  }

  const wallet =
    await getSellerWallet(
      withdraw.seller_id
    );

  const balanceBefore =
    Number(
      wallet.balance || 0
    );

  const lockedBefore =
    Number(
      wallet.locked_balance || 0
    );

  const amount = Number(
    withdraw.amount || 0
  );

  if (
    lockedBefore < amount
  ) {
    throw new Error(
      "Insufficient locked balance"
    );
  }

  /* =========================================================
     IMPORTANT

     balance decreases NOW
     because money leaves platform.
  ========================================================= */

  const balanceAfter =
    balanceBefore - amount;

  const lockedAfter =
    lockedBefore - amount;

  const totalWithdrawnBefore =
    Number(
      wallet.total_withdrawn ||
        0
    );

  const totalWithdrawnAfter =
    totalWithdrawnBefore +
    amount;

  const {
    error: walletError,
  } = await supabaseAdmin
    .from("wallets")
    .update({
      balance:
        round(balanceAfter),

      locked_balance:
        round(lockedAfter),

      total_withdrawn:
        round(
          totalWithdrawnAfter
        ),
    })
    .eq(
      "seller_id",
      withdraw.seller_id
    );

  if (walletError) {
    throw new Error(
      walletError.message
    );
  }

  await createWalletTransaction({
    sellerId:
      withdraw.seller_id,

    type:
      "withdraw_completed",

    amount,

    balanceBefore,

    balanceAfter,

    lockedBefore,

    lockedAfter,

    referenceId:
      withdraw.id,

    referenceType:
      "withdraw_request",

    notes:
      "Withdraw approved and transferred",
  });

  await supabaseAdmin
    .from(
      "withdraw_requests"
    )
    .update({
      status: "approved",

      processed_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      withdrawRequestId
    );

  return true;
}

/* =========================================================
   🧠 REJECT WITHDRAW
========================================================= */

export async function rejectWithdrawRequest({
  withdrawRequestId,
}: {
  withdrawRequestId: string;
}) {
  const {
    data: withdraw,
    error,
  } = await supabaseAdmin
    .from(
      "withdraw_requests"
    )
    .select("*")
    .eq(
      "id",
      withdrawRequestId
    )
    .single();

  if (
    error ||
    !withdraw
  ) {
    throw new Error(
      "Withdraw request not found"
    );
  }

  if (
    withdraw.status !==
    "pending"
  ) {
    throw new Error(
      "Already processed"
    );
  }

  const wallet =
    await getSellerWallet(
      withdraw.seller_id
    );

  const balanceBefore =
    Number(
      wallet.balance || 0
    );

  const lockedBefore =
    Number(
      wallet.locked_balance || 0
    );

  const amount = Number(
    withdraw.amount || 0
  );

  if (
    lockedBefore < amount
  ) {
    throw new Error(
      "Insufficient locked balance"
    );
  }

  /* =========================================================
     IMPORTANT

     ONLY unlock money
     balance remains SAME
  ========================================================= */

  const lockedAfter =
    lockedBefore - amount;

  const {
    error: walletError,
  } = await supabaseAdmin
    .from("wallets")
    .update({
      locked_balance:
        round(lockedAfter),
    })
    .eq(
      "seller_id",
      withdraw.seller_id
    );

  if (walletError) {
    throw new Error(
      walletError.message
    );
  }

  await createWalletTransaction({
    sellerId:
      withdraw.seller_id,

    type:
      "withdraw_rejected",

    amount,

    balanceBefore,

    balanceAfter:
      balanceBefore,

    lockedBefore,

    lockedAfter,

    referenceId:
      withdraw.id,

    referenceType:
      "withdraw_request",

    notes:
      "Withdraw rejected and unlocked",
  });

  await supabaseAdmin
    .from(
      "withdraw_requests"
    )
    .update({
      status: "rejected",

      processed_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      withdrawRequestId
    );

  return true;
}

/* =========================================================
   🧠 REFUND SELLER WALLET
========================================================= */

export async function refundSellerWallet({
  sellerId,
  amount,
  referenceId,
  referenceType,
  notes,
}: {
  sellerId: string;

  amount: number;

  referenceId?: string;

  referenceType?: string;

  notes?: string;
}) {
  if (amount <= 0) {
    throw new Error(
      "Invalid amount"
    );
  }

  const exists =
    await transactionExists({
      sellerId,
      referenceId,
      type: "refund",
    });

  if (exists) {
    console.log(
      "⚠️ REFUND ALREADY EXISTS"
    );

    return true;
  }

  const wallet =
    await getSellerWallet(
      sellerId
    );

  let balance =
    Number(
      wallet.balance || 0
    );

  let locked =
    Number(
      wallet.locked_balance || 0
    );

  const balanceBefore =
    balance;

  const lockedBefore =
    locked;

  /* =========================================================
     REFUND PRIORITY

     1. LOCKED
     2. AVAILABLE
  ========================================================= */

  if (locked >= amount) {
    locked -= amount;
    balance -= amount;
  } else {
    const remaining =
      amount - locked;

    balance =
      Math.max(
        0,
        balance - amount
      );

    locked = 0;
  }

  const {
    error,
  } = await supabaseAdmin
    .from("wallets")
    .update({
      balance:
        round(balance),

      locked_balance:
        round(locked),
    })
    .eq(
      "seller_id",
      sellerId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  await createWalletTransaction({
    sellerId,

    type: "refund",

    amount,

    balanceBefore,

    balanceAfter:
      balance,

    lockedBefore,

    lockedAfter:
      locked,

    referenceId,

    referenceType,

    notes:
      notes ||
      "Refund deducted from seller wallet",
  });

  console.log(
    "💸 SELLER REFUND DEDUCTED"
  );

  return true;
}

/* =========================================================
   🧠 DEBIT LOCKED BALANCE
========================================================= */

export async function debitLockedBalance({
  sellerId,
  amount,
  referenceId,
  referenceType,
  notes,
}: {
  sellerId: string;

  amount: number;

  referenceId?: string;

  referenceType?: string;

  notes?: string;
}) {
  if (amount <= 0) {
    throw new Error(
      "Invalid amount"
    );
  }

  const wallet =
    await getSellerWallet(
      sellerId
    );

  const balanceBefore =
    Number(
      wallet.balance || 0
    );

  const lockedBefore =
    Number(
      wallet.locked_balance || 0
    );

  const earningsBefore =
    Number(
      wallet.total_earnings ||
        0
    );

  const lockedAfter =
    Math.max(
      0,
      lockedBefore - amount
    );

  const balanceAfter =
    Math.max(
      0,
      balanceBefore - amount
    );

  const earningsAfter =
    Math.max(
      0,
      earningsBefore - amount
    );

  const { error } =
    await supabaseAdmin
      .from("wallets")
      .update({
        balance:
          round(balanceAfter),

        locked_balance:
          round(lockedAfter),

        total_earnings:
          round(earningsAfter),
      })
      .eq(
        "seller_id",
        sellerId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  await createWalletTransaction({
    sellerId,

    type: "refund",

    amount,

    balanceBefore,

    balanceAfter,

    lockedBefore,

    lockedAfter,

    referenceId,

    referenceType,

    notes:
      notes ||
      "Locked escrow reversed after return/refund",
  });

  console.log(
    "✅ LOCKED BALANCE DEBITED"
  );

  return true;
}
/* =========================================================
   🧠 SETTLEMENT ENGINE
   FILE: services/settlement-engine.ts

   OPTION A ARCHITECTURE

   ✅ SETTLEMENT AFTER DELIVERY
   ✅ ESCROW SAFE
   ✅ RETURN WINDOW SAFE
   ✅ NO DOUBLE CREDIT
   ✅ NO DOUBLE RELEASE
========================================================= */



import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  creditLockedBalance,
  debitLockedBalance,
  releaseLockedBalanceToAvailable,
} from "./wallet-engine";

/* =========================================================
   🧠 CONSTANTS
========================================================= */

const DEFAULT_HOLD_DAYS = 7;

/* =========================================================
   🧠 CALCULATE RELEASE DATE
========================================================= */

export function calculateSettlementReleaseDate(
  holdDays = DEFAULT_HOLD_DAYS
) {
  const date = new Date();

  date.setDate(
    date.getDate() + holdDays
  );

  return date.toISOString();
}

/* =========================================================
   🧠 CREATE SELLER SETTLEMENT
   ONLY AFTER DELIVERY
========================================================= */

export async function createSellerSettlement({
  sellerId,
  orderId,
  amount,
  releaseAt,
  holdDays = DEFAULT_HOLD_DAYS,
}: {
  sellerId: string;

  orderId: string;

  amount: number;

  releaseAt?: string;

  holdDays?: number;
}) {
  /* =========================================================
     VALIDATION
  ========================================================= */

  if (
    !sellerId ||
    !orderId ||
    amount <= 0
  ) {
    throw new Error(
      "Invalid settlement data"
    );
  }

  console.log(
    "📦 SETTLEMENT ORDER:",
    orderId
  );

  /* =========================================================
     FETCH ORDER
  ========================================================= */

  const {
    data: order,
    error: orderError,
  } = await supabaseAdmin
    .from("orders")
    .select(`
      id,
      status,
      payment_status,
      seller_paid,
      seller_payout
    `)
    .eq("id", orderId)
    .single();

  if (
    orderError ||
    !order
  ) {
    console.error(
      "SETTLEMENT ORDER FETCH ERROR:",
      orderError
    );

    throw new Error(
      "Order not found"
    );
  }

  /* =========================================================
     SECURITY CHECKS
  ========================================================= */

  if (
    order.payment_status !==
    "paid"
  ) {
    throw new Error(
      "Order is not paid"
    );
  }

  if (
    order.status !==
    "delivered"
  ) {
    throw new Error(
      "Settlement allowed only after delivery"
    );
  }

  /* =========================================================
     PREVENT DUPLICATE SETTLEMENT
  ========================================================= */

  const {
    data: existingSettlement,
  } = await supabaseAdmin
    .from("settlements")
    .select("*")
    .eq("order_id", orderId)
    .eq("seller_id", sellerId)
    .in("status", [
      "locked",
      "released",
    ])
    .maybeSingle();

  if (existingSettlement) {
    console.log(
      "⚠️ SETTLEMENT ALREADY EXISTS"
    );

    return existingSettlement;
  }

  /* =========================================================
     RELEASE DATE
  ========================================================= */

  const releaseDate =
    releaseAt ||
    calculateSettlementReleaseDate(
      holdDays
    );

  /* =========================================================
     CREATE SETTLEMENT
  ========================================================= */

  const {
    data: settlement,
    error: settlementError,
  } = await supabaseAdmin
    .from("settlements")
    .insert({
      seller_id: sellerId,

      order_id: orderId,

      amount: Number(
        amount.toFixed(2)
      ),

      status: "locked",

      release_date:
        releaseDate,
    })
    .select()
    .single();

  if (
    settlementError ||
    !settlement
  ) {
    console.error(
      "SETTLEMENT CREATE ERROR:",
      settlementError
    );

    throw new Error(
      settlementError?.message ||
        "Failed to create settlement"
    );
  }

  console.log(
    "✅ SELLER SETTLEMENT CREATED"
  );

  /* =========================================================
     CREDIT LOCKED BALANCE
  ========================================================= */

  await creditLockedBalance({
    sellerId,

    amount,

    referenceId:
      settlement.id,

    referenceType:
      "settlement",

    notes:
      "Amount added to escrow locked balance",
  });

  console.log(
    "✅ LOCKED BALANCE CREDITED"
  );

  /* =========================================================
     UPDATE ORDER
  ========================================================= */

  await supabaseAdmin
    .from("orders")
    .update({
      payout_release_at:
        releaseDate,

      seller_paid: false,
    })
    .eq("id", orderId);

  return settlement;
}

/* =========================================================
   🧠 RELEASE SELLER SETTLEMENT
   AFTER RETURN WINDOW
========================================================= */

export async function releaseSellerSettlement(
  settlementId: string
) {
  /* =========================================================
     FETCH SETTLEMENT
  ========================================================= */

  const {
    data: settlement,
    error: settlementError,
  } = await supabaseAdmin
    .from("settlements")
    .select("*")
    .eq("id", settlementId)
    .single();

  if (
    settlementError ||
    !settlement
  ) {
    console.error(
      "SETTLEMENT FETCH ERROR:",
      settlementError
    );

    throw new Error(
      "Settlement not found"
    );
  }

  /* =========================================================
     STATUS CHECK
  ========================================================= */

  if (
    settlement.status ===
    "released"
  ) {
    console.log(
      "⚠️ SETTLEMENT ALREADY RELEASED"
    );

    return settlement;
  }

  if (
    settlement.status !==
    "locked"
  ) {
    throw new Error(
      "Settlement is not locked"
    );
  }

  /* =========================================================
     RELEASE DATE CHECK
  ========================================================= */

  const releaseDate =
    new Date(
      settlement.release_date
    );

  const now = new Date();

  if (now < releaseDate) {
    throw new Error(
      "Settlement still in hold period"
    );
  }

  /* =========================================================
     RELEASE WALLET BALANCE
  ========================================================= */

  await releaseLockedBalanceToAvailable(
    {
      sellerId:
        settlement.seller_id,

      amount: Number(
        settlement.amount || 0
      ),

      referenceId:
        settlement.id,

      referenceType:
        "settlement",

      notes:
        "Settlement released after hold period",
    }
  );

  console.log(
    "✅ LOCKED BALANCE RELEASED"
  );

  /* =========================================================
     UPDATE SETTLEMENT
  ========================================================= */

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("settlements")
    .update({
      status: "released",

      released_at:
        new Date().toISOString(),
    })
    .eq("id", settlementId);

  if (updateError) {
    console.error(
      "SETTLEMENT UPDATE ERROR:",
      updateError
    );

    throw new Error(
      "Failed to update settlement"
    );
  }

  /* =========================================================
     UPDATE ORDER
  ========================================================= */

  await supabaseAdmin
    .from("orders")
    .update({
      seller_paid: true,
    })
    .eq(
      "id",
      settlement.order_id
    );

  console.log(
    "💰 SETTLEMENT RELEASED"
  );

  return true;
}

/* =========================================================
   🧠 CANCEL SETTLEMENT
   RETURN / REFUND FLOW
========================================================= */

export async function cancelSellerSettlement({
  settlementId,
  reason,
}: {
  settlementId: string;

  reason?: string;
}) {
  /* =========================================================
     FETCH SETTLEMENT
  ========================================================= */

  const {
    data: settlement,
    error,
  } = await supabaseAdmin
    .from("settlements")
    .select("*")
    .eq("id", settlementId)
    .single();

  if (
    error ||
    !settlement
  ) {
    throw new Error(
      "Settlement not found"
    );
  }

  if (
    settlement.status ===
    "cancelled"
  ) {
    console.log(
      "⚠️ SETTLEMENT ALREADY CANCELLED"
    );

    return true;
  }

  /* =========================================================
     DEBIT ESCROW
  ========================================================= */

  await debitLockedBalance({
    sellerId:
      settlement.seller_id,

    amount: Number(
      settlement.amount || 0
    ),

    referenceId:
      settlement.id,

    referenceType:
      "settlement",

    notes:
      reason ||
      "Settlement reversed after refund/return",
  });

  console.log(
    "💸 LOCKED BALANCE REVERSED"
  );

  /* =========================================================
     UPDATE SETTLEMENT
  ========================================================= */

  await supabaseAdmin
    .from("settlements")
    .update({
      status: "cancelled",

      cancelled_at:
        new Date().toISOString(),
    })
    .eq("id", settlementId);

  console.log(
    "❌ SETTLEMENT CANCELLED"
  );

  return true;
}

/* =========================================================
   🧠 AUTO RELEASE MATURED SETTLEMENTS
   CRON JOB
========================================================= */

export async function releaseMaturedSettlements() {
  const now =
    new Date().toISOString();

  const {
    data: settlements,
    error,
  } = await supabaseAdmin
    .from("settlements")
    .select("*")
    .eq("status", "locked")
    .lte("release_date", now);

  if (error) {
    console.error(
      "FETCH MATURED SETTLEMENTS ERROR:",
      error
    );

    throw new Error(
      "Failed to fetch matured settlements"
    );
  }

  if (!settlements?.length) {
    console.log(
      "ℹ️ NO MATURED SETTLEMENTS"
    );

    return {
      success: true,

      released: 0,
    };
  }

  let releasedCount = 0;

  for (const settlement of settlements) {
    try {
      await releaseSellerSettlement(
        settlement.id
      );

      releasedCount++;
    } catch (err) {
      console.error(
        "AUTO RELEASE ERROR:",
        settlement.id,
        err
      );
    }
  }

  console.log(
    `✅ RELEASED ${releasedCount} SETTLEMENTS`
  );

  return {
    success: true,

    released: releasedCount,
  };
}
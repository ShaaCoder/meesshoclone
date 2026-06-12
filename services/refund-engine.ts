import { supabaseAdmin } from "@/lib/supabase-admin";

/* =========================================================
   💰 PROCESS REFUND
========================================================= */

export async function processRefund({
  orderId,
  orderItemId,
  amount,
  userId,
  sellerId,
  reason,
}: {
  orderId: string;
  orderItemId: string;
  amount: number;
  userId: string;
  sellerId?: string;
  reason?: string;
}) {
  try {

    /* ============================= */
    /* 💳 CREATE REFUND RECORD */
    /* ============================= */

    const {
      data: refund,
      error: refundError,
    } = await supabaseAdmin
      .from("refunds")
      .insert({
        order_id: orderId,
        order_item_id: orderItemId,
        user_id: userId,
        amount,
        reason:
          reason || "Return Refund",
        status: "processed",
      })
      .select()
      .single();

    if (refundError) {
      throw refundError;
    }

    /* ============================= */
    /* 👛 CREDIT WALLET */
    /* ============================= */

    const {
      data: wallet,
    } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (wallet) {

      await supabaseAdmin
        .from("wallets")
        .update({
          balance:
            Number(
              wallet.balance || 0
            ) + Number(amount),
        })
        .eq(
          "user_id",
          userId
        );

    } else {

      await supabaseAdmin
        .from("wallets")
        .insert({
          user_id: userId,
          balance: amount,
        });
    }

    /* ============================= */
    /* 🧾 WALLET TRANSACTION */
    /* ============================= */

    await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        type: "credit",
        amount,
        description:
          "Refund credited to wallet",
      });

    return {
      success: true,
      refund,
    };

  } catch (error: any) {

    console.error(
      "PROCESS REFUND ERROR:",
      error
    );

    return {
      success: false,
      message:
        error.message ||
        "Refund failed",
    };
  }
}

/* =========================================================
   ✅ APPROVE REFUND
========================================================= */

export async function approveRefund(
  refundId: string
) {
  try {

    await supabaseAdmin
      .from("refunds")
      .update({
        status: "approved",
      })
      .eq("id", refundId);

    return {
      success: true,
    };

  } catch (error: any) {

    console.error(
      "APPROVE REFUND ERROR:",
      error
    );

    return {
      success: false,
      message:
        error.message,
    };
  }
}
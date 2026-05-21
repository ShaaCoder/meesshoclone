import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  releaseWalletBalance,
} from "@/app/actions/wallet";

export async function GET() {

  try {

    const now =
      new Date().toISOString();

    /* ============================= */
    /* FETCH ELIGIBLE ORDERS */
    /* ============================= */

    const {
      data: orders,
      error,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq(
        "status",
        "delivered"
      )
      .eq(
        "seller_paid",
        false
      )
      .lte(
        "return_deadline",
        now
      );

    if (error) {
      console.log(error);

      throw error;
    }

    /* ============================= */
    /* RELEASE PAYOUTS */
    /* ============================= */

    for (const order of orders || []) {

      for (const item of order.order_items || []) {

        /* ============================= */
        /* SKIP RETURNED ITEMS */
        /* ============================= */

        if (
          item.status ===
            "returned" ||
          item.status ===
            "return_requested"
        ) {
          continue;
        }

        await releaseWalletBalance({
          sellerId:
            item.seller_id,

          orderId:
            order.id,

          amount: Number(
            item.final_price || 0
          ),
        });
      }

      /* ============================= */
      /* MARK PAID */
      /* ============================= */

      await supabaseAdmin
        .from("orders")
        .update({
          seller_paid: true,

          seller_paid_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          order.id
        );
    }

    return NextResponse.json({
      success: true,

      processed:
        orders?.length || 0,
    });

  } catch (error: any) {

    console.log(error);

    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}
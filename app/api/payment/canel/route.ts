import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

import { getSupabaseServer } from "@/lib/supabase-server";

import { revalidatePath } from "next/cache";

/* =======================================================
   ❌ CANCEL ORDER
======================================================= */

export async function POST(
  req: Request
) {
  try {

    const supabase =
      await getSupabaseServer();

    /* =======================================================
       🔐 AUTH
    ======================================================= */

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {

      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /* =======================================================
       📥 BODY
    ======================================================= */

    const {
      orderId,
      reason,
    } =
      await req.json();

    if (!orderId) {

      return NextResponse.json(
        {
          error:
            "Order ID required",
        },
        {
          status: 400,
        }
      );
    }

    /* =======================================================
       📦 FETCH ORDER
    ======================================================= */

    const {
      data: order,
      error: orderError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            variant_id,
            quantity
          )
        `)
        .eq(
          "id",
          orderId
        )
        .single();

    if (
      orderError ||
      !order
    ) {

      console.error(
        "ORDER ERROR:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Order not found",
        },
        {
          status: 404,
        }
      );
    }

    /* =======================================================
       🔐 SECURITY
    ======================================================= */

    if (
      order.customer_id !==
      user.id
    ) {

      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    /* =======================================================
       🚫 ALREADY CANCELLED
    ======================================================= */

    if (
      order.status ===
      "cancelled"
    ) {

      return NextResponse.json(
        {
          success: true,
          alreadyCancelled:
            true,
        }
      );
    }

    /* =======================================================
       🚫 DELIVERED ORDER
    ======================================================= */

    if (
      order.status ===
        "delivered" ||
      order.status ===
        "shipped" ||
      order.status ===
        "out_for_delivery"
    ) {

      return NextResponse.json(
        {
          error:
            "Order cannot be cancelled now",
        },
        {
          status: 400,
        }
      );
    }

    /* =======================================================
       📅 TIME
    ======================================================= */

    const now =
      new Date().toISOString();

    /* =======================================================
       ❌ UPDATE ORDER
    ======================================================= */

    const {
      error:
        orderUpdateError,
    } =
      await supabaseAdmin
        .from("orders")
        .update({
          status:
            "cancelled",

          cancelled_at:
            now,

          cancellation_reason:
            reason ||
            "Cancelled by customer",

          payment_status:
            order.payment_method ===
            "online"
              ? "refund_pending"
              : order.payment_status,
        })
        .eq(
          "id",
          order.id
        );

    if (
      orderUpdateError
    ) {

      console.error(
        "ORDER UPDATE ERROR:",
        orderUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to cancel order",
        },
        {
          status: 500,
        }
      );
    }

    /* =======================================================
       ❌ UPDATE ORDER ITEMS
    ======================================================= */

    const {
      error:
        itemUpdateError,
    } =
      await supabaseAdmin
        .from("order_items")
        .update({
          status:
            "cancelled",

          cancelled_at:
            now,
        })
        .eq(
          "order_id",
          order.id
        );

    if (
      itemUpdateError
    ) {

      console.error(
        "ITEM UPDATE ERROR:",
        itemUpdateError
      );
    }

    /* =======================================================
       ♻️ RESTORE STOCK
    ======================================================= */

    for (const item of order.order_items ||
      []) {

      const {
        data: variant,
      } =
        await supabaseAdmin
          .from(
            "product_variants"
          )
          .select(`
            stock,
            reserved_stock
          `)
          .eq(
            "id",
            item.variant_id
          )
          .single();

      if (
        !variant
      ) {
        continue;
      }

      await supabaseAdmin
        .from(
          "product_variants"
        )
        .update({
          reserved_stock:
            Math.max(
              0,
              Number(
                variant.reserved_stock ||
                  0
              ) -
                Number(
                  item.quantity ||
                    0
                )
            ),
        })
        .eq(
          "id",
          item.variant_id
        );
    }

    /* =======================================================
       💳 UPDATE PAYMENT
    ======================================================= */

    if (
      order.payment_method ===
      "online"
    ) {

      await supabaseAdmin
        .from("payments")
        .update({
          status:
            order.payment_status ===
            "paid"
              ? "refund_pending"
              : "cancelled",
        })
        .eq(
          "order_id",
          order.id
        );
    }

    /* =======================================================
       ♻️ REVALIDATE
    ======================================================= */

    try {

      revalidatePath(
        "/dashboard/user/orders"
      );

      revalidatePath(
        "/dashboard/admin/orders"
      );

      revalidatePath(
        "/dashboard/seller/orders"
      );

      revalidatePath(
        `/dashboard/user/orders/${order.order_code}`
      );

    } catch (
      error
    ) {

      console.error(
        "REVALIDATE ERROR:",
        error
      );
    }

    /* =======================================================
       ✅ SUCCESS
    ======================================================= */

    return NextResponse.json({
      success: true,

      message:
        order.payment_method ===
          "online" &&
        order.payment_status ===
          "paid"
          ? "Order cancelled. Refund will be processed soon."
          : "Order cancelled successfully",
    });

  } catch (
    error: any
  ) {

    console.error(
      "CANCEL ORDER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to cancel order",
      },
      {
        status: 500,
      }
    );
  }
}
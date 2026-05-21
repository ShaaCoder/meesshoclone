import crypto from "crypto";

import { NextResponse } from "next/server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const supabase =
      await getSupabaseServer();

    /* =======================================================
       🔐 AUTH CHECK
    ======================================================= */

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /* =======================================================
       📥 BODY
    ======================================================= */

    const body =
      await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing payment data",
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
    } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (
      orderError ||
      !order
    ) {
      console.error(
        "❌ ORDER FETCH ERROR:",
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
       🔐 SECURITY CHECK
    ======================================================= */

    if (
      order.customer_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    /* =======================================================
       🔁 ALREADY PAID
    ======================================================= */

    if (
      order.payment_status ===
      "paid"
    ) {
      return NextResponse.json({
        success: true,

        alreadyPaid: true,
      });
    }

    /* =======================================================
       🔑 VERIFY RAZORPAY SIGNATURE
    ======================================================= */

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env
            .RAZORPAY_KEY_SECRET!
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    if (
      generatedSignature !==
      razorpay_signature
    ) {
      console.error(
        "❌ INVALID SIGNATURE"
      );

      return NextResponse.json(
        {
          error:
            "Invalid payment signature",
        },
        {
          status: 400,
        }
      );
    }

    /* =======================================================
       💳 FETCH PAYMENT
    ======================================================= */

    const {
      data: payment,
      error: paymentError,
    } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("order_id", order.id)
      .maybeSingle();

    if (
      paymentError ||
      !payment
    ) {
      console.error(
        "❌ PAYMENT FETCH ERROR:",
        paymentError
      );

      return NextResponse.json(
        {
          error:
            "Payment not found",
        },
        {
          status: 404,
        }
      );
    }

    /* =======================================================
       🔐 ORDER VALIDATION
    ======================================================= */

    if (
      payment.razorpay_order_id !==
      razorpay_order_id
    ) {
      return NextResponse.json(
        {
          error:
            "Order mismatch",
        },
        {
          status: 400,
        }
      );
    }

    /* =======================================================
       📦 FETCH ORDER ITEMS
    ======================================================= */

    const {
      data: items,
      error: itemsError,
    } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq(
        "order_id",
        order.id
      );

    if (
      itemsError ||
      !items?.length
    ) {
      console.error(
        "❌ ORDER ITEMS ERROR:",
        itemsError
      );

      return NextResponse.json(
        {
          error:
            "Order items not found",
        },
        {
          status: 404,
        }
      );
    }

    /* =======================================================
       💰 CALCULATE TOTALS
    ======================================================= */

    let sellerTotal = 0;

    let platformProfit = 0;

    for (const item of items) {
      const quantity =
        Number(
          item.quantity || 0
        );

      const costPrice =
        Number(
          item.cost_price || 0
        );

      const finalPrice =
        Number(
          item.final_price || 0
        );

      sellerTotal +=
        costPrice * quantity;

      platformProfit +=
        (finalPrice -
          costPrice) *
        quantity;
    }

    console.log(
      "💰 SELLER PAYOUT:",
      sellerTotal
    );

    console.log(
      "💸 PLATFORM PROFIT:",
      platformProfit
    );

    /* =======================================================
       ✅ UPDATE ORDER
       IMPORTANT:
       PAYMENT SUCCESS ≠ SELLER ACCEPTED
    ======================================================= */

    const now =
      new Date().toISOString();

    const {
      error: updateOrderError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status:
          "paid",

        /*
          KEEP ORDER IN PLACED STATE

          Seller must manually accept
        */

        status:
          "placed",

        seller_payout:
          sellerTotal,

        platform_profit:
          platformProfit,
      })
      .eq("id", order.id);

    if (updateOrderError) {
      console.error(
        "❌ ORDER UPDATE ERROR:",
        updateOrderError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update order",
        },
        {
          status: 500,
        }
      );
    }

    /* =======================================================
       📦 UPDATE ORDER ITEMS
    ======================================================= */

    const {
      error:
        updateItemsError,
    } = await supabaseAdmin
      .from("order_items")
      .update({
        /*
          KEEP ITEMS IN PLACED STATE
        */

        status:
          "placed",
      })
      .eq(
        "order_id",
        order.id
      );

    if (
      updateItemsError
    ) {
      console.error(
        "❌ ORDER ITEMS UPDATE ERROR:",
        updateItemsError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update order items",
        },
        {
          status: 500,
        }
      );
    }

    /* =======================================================
       💾 UPDATE PAYMENT
    ======================================================= */

    const {
      error:
        updatePaymentError,
    } = await supabaseAdmin
      .from("payments")
      .update({
        razorpay_payment_id,

        razorpay_signature,

        status: "success",

        paid_at: now,
      })
      .eq("id", payment.id);

    if (
      updatePaymentError
    ) {
      console.error(
        "❌ PAYMENT UPDATE ERROR:",
        updatePaymentError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update payment",
        },
        {
          status: 500,
        }
      );
    }

    /* =======================================================
       🛒 CLEAR CART
    ======================================================= */

    try {
      await supabaseAdmin
        .from("cart")
        .delete()
        .eq(
          "user_id",
          user.id
        );
    } catch (cartError) {
      console.error(
        "❌ CART CLEAR ERROR:",
        cartError
      );
    }

    /* =======================================================
       ♻️ REVALIDATE
    ======================================================= */

    try {
      const {
        revalidatePath,
      } = await import(
        "next/cache"
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
    } catch (e) {
      console.error(
        "REVALIDATE ERROR:",
        e
      );
    }

    /* =======================================================
       ✅ SUCCESS
    ======================================================= */

    return NextResponse.json({
      success: true,

      orderId:
        order.id,

      orderCode:
        order.order_code,

      paymentId:
        razorpay_payment_id,
    });
  } catch (error) {
    console.error(
      "❌ VERIFY API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong during payment verification",
      },
      {
        status: 500,
      }
    );
  }
}
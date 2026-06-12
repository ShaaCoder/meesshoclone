import crypto from "crypto";

import { NextResponse } from "next/server";

import { revalidatePath } from "next/cache";

import { getSupabaseServer } from "@/lib/supabase-server";

import { supabaseAdmin } from "@/lib/supabase-admin";

/* =======================================================
   💳 VERIFY PAYMENT
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

    const body =
      await req.json();

    console.log(
      "VERIFY BODY:",
      body
    );

    /* =======================================================
       🔥 SUPPORT BOTH FORMATS
    ======================================================= */

    const razorpay_order_id =
      body.razorpay_order_id ||
      body.razorpayOrderId;

    const razorpay_payment_id =
      body.razorpay_payment_id ||
      body.razorpayPaymentId;

    const razorpay_signature =
      body.razorpay_signature ||
      body.razorpaySignature;

    const orderId =
      body.orderId;

    /* =======================================================
       ✅ VALIDATION
    ======================================================= */

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {

      console.error(
        "❌ MISSING PAYMENT DATA:",
        {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          orderId,
        }
      );

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
    } =
      await supabaseAdmin
        .from("orders")
        .select(`
          *,
          
          order_items (
            id,
            variant_id,
            quantity,
            seller_earning,
            platform_fee,
            shipping_fee,
            gst_amount,
            final_price,
            status
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
        "❌ ORDER ERROR:",
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
       ✅ ALREADY PAID
    ======================================================= */

    if (
      order.payment_status ===
      "paid"
    ) {

      return NextResponse.json({
        success: true,

        alreadyPaid: true,

        orderId:
          order.id,

        orderCode:
          order.order_code,
      });
    }

    /* =======================================================
       🔑 VERIFY SIGNATURE
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

    console.log(
      "GENERATED SIGNATURE:",
      generatedSignature
    );

    console.log(
      "RAZORPAY SIGNATURE:",
      razorpay_signature
    );

    if (
      generatedSignature !==
      razorpay_signature
    ) {

      console.error(
        "❌ INVALID SIGNATURE"
      );

      /* =======================================================
         FAILED PAYMENT
      ======================================================= */

      await supabaseAdmin
        .from("orders")
        .update({
          payment_status:
            "failed",

          status:
            "cancelled",
        })
        .eq(
          "id",
          order.id
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
    } =
      await supabaseAdmin
        .from("payments")
        .select("*")
        .eq(
          "order_id",
          order.id
        )
        .maybeSingle();

    if (
      paymentError ||
      !payment
    ) {

      console.error(
        "❌ PAYMENT ERROR:",
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
       🔐 VALIDATE ORDER
    ======================================================= */

    if (
      payment.razorpay_order_id &&
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
       🧠 CALCULATE TOTALS
    ======================================================= */

    const items =
      order.order_items || [];

    let sellerPayout = 0;

    let platformProfit = 0;

    let shippingTotal = 0;

    let gstTotal = 0;

    for (const item of items) {

      sellerPayout += Number(
        item.seller_earning ||
          0
      );

      platformProfit += Number(
        item.platform_fee ||
          0
      );

      shippingTotal += Number(
        item.shipping_fee ||
          0
      );

      gstTotal += Number(
        item.gst_amount ||
          0
      );
    }

    sellerPayout =
      Math.round(
        sellerPayout
      );

    platformProfit =
      Math.round(
        platformProfit
      );

    shippingTotal =
      Math.round(
        shippingTotal
      );

    gstTotal =
      Math.round(
        gstTotal
      );

    /* =======================================================
       📅 TIME
    ======================================================= */

    const now =
      new Date().toISOString();

    /* =======================================================
       🔥 IMPORTANT FIX
       
       ONLINE PAYMENT:
       NOW reserve stock AFTER payment success
    ======================================================= */

    for (const item of items) {

      const {
        data: variant,
        error: variantError,
      } =
        await supabaseAdmin
          .from(
            "product_variants"
          )
          .select(`
            id,
            stock,
            reserved_stock
          `)
          .eq(
            "id",
            item.variant_id
          )
          .single();

      if (
        variantError ||
        !variant
      ) {

        console.error(
          "❌ VARIANT ERROR:",
          variantError
        );

        return NextResponse.json(
          {
            error:
              "Variant not found",
          },
          {
            status: 404,
          }
        );
      }

      const availableStock =
        Number(
          variant.stock || 0
        ) -
        Number(
          variant.reserved_stock ||
            0
        );

      if (
        availableStock <
        Number(
          item.quantity
        )
      ) {

        console.error(
          "❌ OUT OF STOCK"
        );

        /* =======================================================
           PAYMENT REFUND CASE
        ======================================================= */

        await supabaseAdmin
          .from("orders")
          .update({
            payment_status:
              "refund_pending",

            status:
              "cancelled",
          })
          .eq(
            "id",
            order.id
          );

        return NextResponse.json(
          {
            error:
              "Product went out of stock",
          },
          {
            status: 400,
          }
        );
      }

      /* =======================================================
         RESERVE STOCK
      ======================================================= */

      const {
        error:
          reserveError,
      } =
        await supabaseAdmin
          .from(
            "product_variants"
          )
          .update({
            reserved_stock:
              Number(
                variant.reserved_stock ||
                  0
              ) + item.quantity,
          })
          .eq(
            "id",
            item.variant_id
          );

      if (
        reserveError
      ) {

        console.error(
          "❌ RESERVE ERROR:",
          reserveError
        );

        return NextResponse.json(
          {
            error:
              "Failed to reserve stock",
          },
          {
            status: 500,
          }
        );
      }
    }

    /* =======================================================
       ✅ UPDATE ORDER
    ======================================================= */

    const {
      error:
        orderUpdateError,
    } =
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status:
            "paid",

          status:
            "placed",

          seller_payout:
            sellerPayout,

          platform_profit:
            platformProfit,

          shipping_amount:
            shippingTotal,

          gst_amount:
            gstTotal,

          paid_at:
            now,
        })
        .eq(
          "id",
          order.id
        );

    if (
      orderUpdateError
    ) {

      console.error(
        "❌ ORDER UPDATE ERROR:",
        orderUpdateError
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
        orderItemsError,
    } =
      await supabaseAdmin
        .from("order_items")
        .update({
          status:
            "placed",
        })
        .eq(
          "order_id",
          order.id
        );

    if (
      orderItemsError
    ) {

      console.error(
        "❌ ORDER ITEMS ERROR:",
        orderItemsError
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
        paymentUpdateError,
    } =
      await supabaseAdmin
        .from("payments")
        .update({
          razorpay_payment_id,

          razorpay_signature,

          razorpay_order_id,

          status:
            "success",

          paid_at:
            now,
        })
        .eq(
          "id",
          payment.id
        );

    if (
      paymentUpdateError
    ) {

      console.error(
        "❌ PAYMENT UPDATE ERROR:",
        paymentUpdateError
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
       
       ✅ NOW SAFE
       payment successful
    ======================================================= */

    try {

      await supabaseAdmin
        .from("cart")
        .delete()
        .eq(
          "user_id",
          user.id
        );

    } catch (
      cartError
    ) {

      console.error(
        "❌ CART ERROR:",
        cartError
      );
    }

    /* =======================================================
       ♻️ REVALIDATE
    ======================================================= */

    try {

      revalidatePath(
        "/cart"
      );

      revalidatePath(
        "/dashboard/admin/orders"
      );

      revalidatePath(
        "/dashboard/seller/orders"
      );

      revalidatePath(
        "/dashboard/user/orders"
      );

      revalidatePath(
        `/dashboard/user/orders/${order.order_code}`
      );

    } catch (
      revalidateError
    ) {

      console.error(
        "❌ REVALIDATE ERROR:",
        revalidateError
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

  } catch (error: any) {

    console.error(
      "🔥 VERIFY ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Payment verification failed",
      },
      {
        status: 500,
      }
    );
  }
}
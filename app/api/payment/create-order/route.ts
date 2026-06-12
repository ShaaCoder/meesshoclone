import { razorpay } from "@/lib/razorpay";

import { NextResponse } from "next/server";

import { getSupabaseServer } from "@/lib/supabase-server";

import { supabaseAdmin } from "@/lib/supabase-admin";

/* =======================================================
   🚀 CREATE RAZORPAY ORDER
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
       📦 BODY
    ======================================================= */

    const { orderId } =
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
          id,
          customer_id,
          order_code,
          total_amount,
          payment_status,
          status
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
       🚫 ALREADY PAID
    ======================================================= */

    if (
      order.payment_status ===
      "paid"
    ) {

      return NextResponse.json(
        {
          error:
            "Order already paid",
        },
        {
          status: 400,
        }
      );
    }

    /* =======================================================
       🚫 CANCELLED
    ======================================================= */

    if (
      order.status ===
      "cancelled"
    ) {

      return NextResponse.json(
        {
          error:
            "Cancelled order cannot be paid",
        },
        {
          status: 400,
        }
      );
    }

    /* =======================================================
       💰 VALIDATE AMOUNT
    ======================================================= */

    const totalAmount =
      Number(
        order.total_amount ||
          0
      );

    if (
      totalAmount <= 0
    ) {

      return NextResponse.json(
        {
          error:
            "Invalid order amount",
        },
        {
          status: 400,
        }
      );
    }

    const amountInPaise =
      Math.round(
        totalAmount * 100
      );

    console.log(
      "💳 AMOUNT:",
      amountInPaise
    );

    /* =======================================================
       🧾 CREATE RAZORPAY ORDER
    ======================================================= */

    const razorpayOrder =
      await razorpay.orders.create(
        {
          amount:
            amountInPaise,

          currency:
            "INR",

          receipt:
            order.order_code,

          notes: {

            order_id:
              order.id,

            customer_id:
              user.id,
          },
        }
      );

    console.log(
      "🧾 RAZORPAY:",
      razorpayOrder
    );

    /* =======================================================
       💾 SAVE RAZORPAY ORDER ID
    ======================================================= */

    await supabaseAdmin
      .from("orders")
      .update({
        razorpay_order_id:
          razorpayOrder.id,
      })
      .eq(
        "id",
        order.id
      );

    /* =======================================================
       💾 CHECK EXISTING PAYMENT
    ======================================================= */

    const {
      data: existingPayment,
    } =
      await supabaseAdmin
        .from("payments")
        .select("id")
        .eq(
          "order_id",
          order.id
        )
        .maybeSingle();

    /* =======================================================
       🔄 UPDATE PAYMENT
    ======================================================= */

    if (
      existingPayment
    ) {

      const {
        error:
          updateError,
      } =
        await supabaseAdmin
          .from(
            "payments"
          )
          .update({
            razorpay_order_id:
              razorpayOrder.id,

            amount:
              totalAmount,

            status:
              "created",

            payment_method:
              "razorpay",
          })
          .eq(
            "id",
            existingPayment.id
          );

      if (
        updateError
      ) {

        console.error(
          "PAYMENT UPDATE ERROR:",
          updateError
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
    }

    /* =======================================================
       ➕ INSERT PAYMENT
    ======================================================= */

    else {

      const {
        error:
          insertError,
      } =
        await supabaseAdmin
          .from(
            "payments"
          )
          .insert({
            order_id:
              order.id,

            customer_id:
              user.id,

            razorpay_order_id:
              razorpayOrder.id,

            amount:
              totalAmount,

            status:
              "created",

            payment_method:
              "razorpay",
          });

      if (
        insertError
      ) {

        console.error(
          "PAYMENT INSERT ERROR:",
          insertError
        );

        return NextResponse.json(
          {
            error:
              "Failed to create payment",
          },
          {
            status: 500,
          }
        );
      }
    }

    /* =======================================================
       🧾 IMPORTANT RESPONSE FIX
    ======================================================= */

    return NextResponse.json({
      success: true,

      razorpayOrder: {

        id:
          razorpayOrder.id,

        amount:
          razorpayOrder.amount,

        currency:
          razorpayOrder.currency,
      },

      internalOrderId:
        order.id,

      orderCode:
        order.order_code,

      key:
        process.env
          .NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });

  } catch (
    err: any
  ) {

    console.error(
      "🔥 RAZORPAY CREATE ERROR:",
      err
    );

    return NextResponse.json(
      {
        error:
          err?.message ||
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
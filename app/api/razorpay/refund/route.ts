import { NextRequest, NextResponse } from "next/server";

import Razorpay from "razorpay";

import { supabaseAdmin } from "@/lib/supabase-admin";

const razorpay = new Razorpay({
  key_id:
    process.env
      .RAZORPAY_KEY_ID!,

  key_secret:
    process.env
      .RAZORPAY_KEY_SECRET!,
});

export async function POST(
  req: NextRequest
) {
  try {

    /* ============================= */
    /* BODY */
    /* ============================= */

    const body =
      await req.json();

    const {
      orderId,
      amount,
    } = body;

    if (
      !orderId ||
      !amount
    ) {
      return NextResponse.json(
        {
          error:
            "Missing params",
        },
        {
          status: 400,
        }
      );
    }

    /* ============================= */
    /* FETCH PAYMENT */
    /* ============================= */

    const {
      data: payment,
      error: paymentError,
    } =
      await supabaseAdmin
        .from("payments")
        .select("*")
        .eq(
          "order_id",
          orderId
        )
        .single();

    if (
      paymentError ||
      !payment
    ) {
      console.log(
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

    /* ============================= */
    /* VALIDATE PAYMENT */
    /* ============================= */

    if (
      !payment.razorpay_payment_id
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment",
        },
        {
          status: 400,
        }
      );
    }

    /* ============================= */
    /* CREATE REFUND */
    /* ============================= */

    const refund =
      await razorpay.payments.refund(
        payment.razorpay_payment_id,
        {
          amount:
            Math.round(
              Number(amount) *
                100
            ),

          speed:
            "normal",

          notes: {
            order_id:
              orderId,
          },
        }
      );

    console.log(
      "RAZORPAY REFUND",
      refund
    );

    /* ============================= */
    /* UPDATE ORDER */
    /* ============================= */

    await supabaseAdmin
      .from("orders")
      .update({
        refund_amount:
          amount,

        refund_status:
          "processed",
      })
      .eq("id", orderId);

    /* ============================= */
    /* UPDATE PAYMENT */
    /* ============================= */

    await supabaseAdmin
      .from("payments")
      .update({
        status:
          "refunded",
      })
      .eq("id", payment.id);

    return NextResponse.json({
      success: true,

      refund,
    });

  } catch (error: any) {

    console.log(
      "REFUND ERROR"
    );

    console.log(error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Refund failed",
      },
      {
        status: 500,
      }
    );
  }
}
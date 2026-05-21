import { razorpay } from "@/lib/razorpay";
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();

    /* ============================= */
    /* 🔐 AUTH CHECK */
    /* ============================= */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID required" },
        { status: 400 }
      );
    }

    /* ============================= */
    /* 📦 GET ORDER */
    /* ============================= */
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      console.error("❌ FETCH ERROR:", error);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    /* ============================= */
    /* 🔐 SECURITY CHECK */
    /* ============================= */
    if (order.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("📦 ORDER FROM DB 👉", order);

    /* ============================= */
    /* 💰 VALIDATE AMOUNT */
    /* ============================= */
    const totalAmount = Number(order.total_amount);

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid order amount", amount: totalAmount },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(totalAmount * 100);

    console.log("💳 AMOUNT SENT TO RAZORPAY 👉", amountInPaise);

    /* ============================= */
    /* 💳 CREATE RAZORPAY ORDER */
    /* ============================= */
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: order.order_code, // ✅ FIXED (short & valid)
    });

    console.log("🧾 RAZORPAY ORDER 👉", razorpayOrder);

    /* ============================= */
    /* 💾 SAVE PAYMENT (DB-SAFE) */
    /* ============================= */
    const { data: existingPayments } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("order_id", orderId)
      .limit(1);

    const existingPayment = existingPayments?.[0];
    let paymentUpsertError;

    if (existingPayment) {
      const { error } = await supabaseAdmin
        .from("payments")
        .update({
          razorpay_order_id: razorpayOrder.id,
          status: "created",
        })
        .eq("id", existingPayment.id);
      paymentUpsertError = error;
    } else {
      const { error } = await supabaseAdmin
        .from("payments")
        .insert({
          order_id: orderId,
          razorpay_order_id: razorpayOrder.id,
          status: "created",
        });
      paymentUpsertError = error;
    }

    if (paymentUpsertError) {
      console.error("❌ PAYMENT UPSERT ERROR:", paymentUpsertError);
      return NextResponse.json(
        { error: "Failed to save payment record" },
        { status: 500 }
      );
    }

    /* ============================= */
    /* 🚀 RESPONSE */
    /* ============================= */
    return NextResponse.json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });

  } catch (err: any) {
    console.error("🔥 CREATE ORDER ERROR:", err);

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
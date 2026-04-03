import { razorpay } from "@/lib/razorpay";
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

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
    const { data: order, error } = await supabase
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
    /* 💾 SAVE RAZORPAY ORDER ID */
    /* ============================= */
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        razorpay_order_id: razorpayOrder.id,
      })
      .eq("id", orderId) // ✅ FIXED (IMPORTANT)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("❌ UPDATE ERROR:", updateError);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    console.log("✅ UPDATED ORDER 👉", updatedOrder);

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
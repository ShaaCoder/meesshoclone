import crypto from "crypto";
import { getSupabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();

  /* ============================= */
  /* 🔐 AUTH CHECK */
  /* ============================= */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,
  } = await req.json();

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
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  /* 🔐 SECURITY CHECK */
  if (order.customer_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  /* 🔁 PREVENT DOUBLE PAYMENT */
  if (order.payment_status === "paid") {
    return NextResponse.json({ success: true });
  }

  /* ============================= */
  /* 🔑 VERIFY SIGNATURE */
  /* ============================= */
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  /* 🔍 ORDER MATCH CHECK */
  if (order.razorpay_order_id !== razorpay_order_id) {
    return NextResponse.json(
      { error: "Order mismatch" },
      { status: 400 }
    );
  }

  /* ============================= */
  /* 📦 GET ORDER ITEMS */
  /* ============================= */
  const { data: items } = await supabase
    .from("order_items")
    .select("quantity, price, cost_price")
    .eq("order_id", order.id);

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "No order items" },
      { status: 400 }
    );
  }

  /* ============================= */
  /* 💰 CALCULATE PAYOUT + PROFIT */
  /* ============================= */
  let sellerTotal = 0;
  let profitTotal = 0;

  for (const item of items) {
    const qty = Number(item.quantity || 0);
    const cost = Number(item.cost_price || 0);   // seller earning
    const selling = Number(item.price || 0);     // customer price

    sellerTotal += cost * qty;
    profitTotal += (selling - cost) * qty;
  }

  console.log("💰 SELLER PAYOUT:", sellerTotal);
  console.log("💸 ADMIN PROFIT:", profitTotal);

  /* ============================= */
  /* ✅ UPDATE ORDER */
  /* ============================= */
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      status: "placed",
      seller_payout: sellerTotal,
    })
    .eq("id", order.id);

  if (updateError) {
    console.error("ORDER UPDATE ERROR:", updateError);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }

  /* ============================= */
  /* 💾 SAVE PAYMENT */
  /* ============================= */
  const { error: paymentError } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      razorpay_order_id,
      razorpay_payment_id,
      status: "success",
    });

  if (paymentError) {
    console.error("PAYMENT SAVE ERROR:", paymentError);
  }

  /* ============================= */
  /* 🎯 RESPONSE */
  /* ============================= */
  return NextResponse.json({
    success: true,
    sellerTotal,
    profitTotal,
  });
}
import crypto from "crypto";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();

  /* ============================= */
  /* 🔐 VERIFY SIGNATURE */
  /* ============================= */
  const body = await req.text(); // ⚠️ RAW BODY REQUIRED
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);

  console.log("📩 Razorpay Webhook:", event.event);

  /* ============================= */
  /* 💳 PAYMENT CAPTURED */
  /* ============================= */
  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const razorpay_order_id = payment.order_id;

    /* 🔍 GET ORDER */
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .single();

    if (!order) {
      console.error("❌ Order not found");
      return new Response("Order not found", { status: 404 });
    }

    /* 🔁 PREVENT DOUBLE UPDATE */
    if (order.payment_status === "paid") {
      return new Response("Already processed", { status: 200 });
    }

    /* ============================= */
    /* 📦 GET ORDER ITEMS */
    /* ============================= */
    const { data: items } = await supabase
      .from("order_items")
      .select("quantity, price, cost_price")
      .eq("order_id", order.id);

    if (!items || items.length === 0) {
      console.error("❌ No order items");
      return new Response("No items", { status: 400 });
    }

    /* ============================= */
    /* 💰 CALCULATE PAYOUT + PROFIT */
    /* ============================= */
    let sellerTotal = 0;
    let profitTotal = 0;

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const cost = Number(item.cost_price || 0);
      const selling = Number(item.price || 0);

      sellerTotal += cost * qty;
      profitTotal += (selling - cost) * qty;
    }

    console.log("💰 SELLER PAYOUT:", sellerTotal);
    console.log("💸 ADMIN PROFIT:", profitTotal);

    /* ============================= */
    /* ✅ UPDATE ORDER */
    /* ============================= */
    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "placed", // correct flow
        seller_payout: sellerTotal,
      })
      .eq("id", order.id);

    /* ============================= */
    /* 💾 SAVE PAYMENT */
    /* ============================= */
    await supabase.from("payments").insert({
      order_id: order.id,
      razorpay_order_id,
      razorpay_payment_id: payment.id,
      status: "success",
    });

    return new Response("Payment captured", { status: 200 });
  }

  /* ============================= */
  /* ❌ PAYMENT FAILED */
  /* ============================= */
  if (event.event === "payment.failed") {
    const payment = event.payload.payment.entity;
    const razorpay_order_id = payment.order_id;

    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        status: "cancelled",
      })
      .eq("razorpay_order_id", razorpay_order_id);

    return new Response("Payment failed handled", { status: 200 });
  }

  return new Response("Event ignored", { status: 200 });
}
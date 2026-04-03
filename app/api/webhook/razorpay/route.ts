import crypto from "crypto";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();

  const body = await req.text(); // ⚠️ RAW BODY
  const signature = req.headers.get("x-razorpay-signature")!;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);

  /* ============================= */
  /* 💳 PAYMENT CAPTURED */
  /* ============================= */
  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;

    const razorpay_order_id = payment.order_id;

    // 🔥 Find your order using razorpay_order_id
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .single();

    if (order) {
      await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", order.id);
    }
  }

  /* ============================= */
  /* ❌ PAYMENT FAILED */
  /* ============================= */
  if (event.event === "payment.failed") {
    const payment = event.payload.payment.entity;

    const razorpay_order_id = payment.order_id;

    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("razorpay_order_id", razorpay_order_id);
  }

  return new Response("OK", { status: 200 });
}
"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";
import { createShipment } from "@/services/shiprocket";
import { getGSTHSN } from "./tax";
/* ============================= */
/* 🧠 TYPES */
/* ============================= */
type OrderInput = {
  paymentMethod: "cod" | "online";
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

/* ============================= */
/* 🚀 PLACE ORDER */
/* ============================= */


/* ============================= */
/* 🚀 PLACE ORDER */
/* ============================= */
export async function placeOrder(data: OrderInput) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  /* ============================= */
  /* 🧾 VALIDATE INPUT */
  /* ============================= */
  if (!data.name || !data.phone || !data.address) {
    throw new Error("Invalid order data");
  }

  if (data.phone.length < 10) {
    throw new Error("Invalid phone");
  }

  /* ============================= */
  /* 🛒 FETCH CART */
  /* ============================= */
  const { data: cart, error } = await supabase
    .from("cart")
    .select(`
      id,
      quantity,
      product_id,
      variant_id,
      products:product_id (
        *,
        categories (commission_percent)
      ),
      product_variants:variant_id (*)
    `)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  if (!cart || cart.length === 0) throw new Error("Cart empty");

  let total = 0;
  let sellerPayout = 0;

  /* ============================= */
  /* 🔥 NORMALIZE + GST + VALIDATION */
  /* ============================= */
  const normalized = await Promise.all(
    cart.map(async (item: any) => {
      const product = Array.isArray(item.products)
        ? item.products[0]
        : item.products;

      const variant = Array.isArray(item.product_variants)
        ? item.product_variants[0]
        : item.product_variants;

      if (!product || product.status !== "approved") {
        throw new Error("Product not available");
      }

      if (!variant) throw new Error("Variant missing");

      /* 🔥 STOCK CHECK */
      if (variant.stock < item.quantity) {
        throw new Error(`Only ${variant.stock} items available`);
      }

      const selling = Number(variant.price || 0);
      if (selling <= 0) throw new Error("Invalid price");

      /* ============================= */
      /* 💰 COMMISSION */
      /* ============================= */
      const commissionPercent =
        Number(product.categories?.commission_percent || 10);

      const margin = (selling * commissionPercent) / 100;
      const cost = selling - margin;

      /* ============================= */
      /* 🧾 GST (LOCKED) */
      /* ============================= */
      const { gst, hsn } = await getGSTHSN(
        product.category_id,
        product.name
      );

      const gstPercent = Number(gst || 0);

      const taxable = selling / (1 + gstPercent / 100);
      const gstAmount = selling - taxable;

      /* ============================= */
      /* 💰 TOTALS */
      /* ============================= */
      const lineTotal = selling * item.quantity;
      const linePayout = cost * item.quantity;

      total += lineTotal;
      sellerPayout += linePayout;

      return {
        product_id: product.id,
        product_name: product.name, // 🔥 SNAPSHOT

        variant_id: variant.id,
        quantity: item.quantity,

        price: selling,
        cost_price: cost,

        gst_percent: gstPercent,
        hsn_code: hsn,
        gst_amount: gstAmount,
        taxable_amount: taxable,

        seller_id: product.seller_id,
      };
    })
  );

  /* ============================= */
  /* 📦 CREATE ORDER */
  /* ============================= */
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      customer_id: user.id,
      total_amount: total,
      seller_payout: sellerPayout,
      payment_method: data.paymentMethod,
      payment_status: "unpaid",
      status: "pending",

      name: data.name,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
    })
    .select()
    .single();

  if (orderError || !order) {
    console.error(orderError);
    throw new Error("Order failed");
  }

  /* ============================= */
  /* 📦 INSERT ORDER ITEMS */
  /* ============================= */
  const items = normalized.map((i) => ({
    order_id: order.id,

    product_id: i.product_id,
    product_name: i.product_name, // 🔥 IMPORTANT

    variant_id: i.variant_id,
    quantity: i.quantity,

    price: i.price,
    cost_price: i.cost_price,

    gst_percent: i.gst_percent,
    hsn_code: i.hsn_code,
    gst_amount: i.gst_amount,
    taxable_amount: i.taxable_amount,

    seller_id: i.seller_id,
  }));

  const { error: itemError } = await supabaseAdmin
    .from("order_items")
    .insert(items);

  if (itemError) {
    console.error(itemError);
    throw new Error("Order items failed");
  }

  /* ============================= */
  /* 🧹 CLEAR CART */
  /* ============================= */
  await supabase.from("cart").delete().eq("user_id", user.id);

  console.log("💰 TOTAL:", total);
  console.log("🧾 SELLER PAYOUT:", sellerPayout);

  return order;
}
/* ============================= */
/* 🚚 CREATE SHIPMENT */
/* ============================= */
export async function createOrderAndShipment(orderData: any) {
  try {
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (error || !order) {
      console.error("ORDER ERROR:", error);
      throw new Error("Order creation failed");
    }

    const shipment = await createShipment(order);

    if (!shipment) {
      throw new Error("Shipment creation failed");
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        shipment_id: shipment.shipment_id,
        awb_code: shipment.awb_code,
        courier_name: shipment.courier_name,
        tracking_url: shipment.tracking_url,
        status: "shipped",
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("SHIPMENT UPDATE ERROR:", updateError);
      throw new Error("Failed to update shipment");
    }

    return order;

  } catch (error: any) {
    console.error("Shipment error:", error);
    throw new Error(error.message || "Shipment failed");
  }
}

export async function markOrderDelivered(orderId: string) {
  /* ============================= */
  /* 🔐 CHECK ORDER */
  /* ============================= */
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("Order not found");

  if (order.status === "delivered") {
    throw new Error("Already delivered");
  }

  /* ============================= */
  /* 🚫 PREVENT DOUBLE CREDIT */
  /* ============================= */
  const { data: alreadyCredited } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id")
    .eq("reference_id", orderId)
    .eq("type", "credit");

  if (alreadyCredited?.length) {
    console.log("⚠️ Already credited");
  } else {
    /* ============================= */
    /* 📦 GET ORDER ITEMS */
    /* ============================= */
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    /* ============================= */
    /* 💰 CREDIT EACH SELLER */
    /* ============================= */
    for (const item of items || []) {
      const sellerId = item.seller_id;

      const earning = Number(item.cost_price || 0) * Number(item.quantity || 1);

      /* 🏦 GET WALLET */
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("seller_id", sellerId)
        .single();

      if (!wallet) continue;

      /* 💸 UPDATE WALLET */
      await supabaseAdmin
        .from("wallets")
        .update({
          balance: wallet.balance + earning,
        })
        .eq("seller_id", sellerId);

      /* 📜 LEDGER */
      await supabaseAdmin.from("wallet_transactions").insert({
        seller_id: sellerId,
        type: "credit",
        amount: earning,
        reference_id: orderId,
        note: "Order delivered earning",
      });
    }
  }

  /* ============================= */
  /* ✅ UPDATE ORDER STATUS */
  /* ============================= */
  await supabaseAdmin
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", orderId);
}
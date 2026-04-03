"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";
import { createShipment } from "@/services/shiprocket";

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
export async function placeOrder(data: OrderInput) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

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
      products:product_id (*),
      product_variants:variant_id (*)
    `)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  if (!cart || cart.length === 0) throw new Error("Cart empty");

  /* ============================= */
  /* 💰 CALCULATE TOTAL */
  /* ============================= */
  let total = 0;

  const normalized = cart.map((item: any) => {
    const product = Array.isArray(item.products)
      ? item.products[0]
      : item.products;

    const variant = Array.isArray(item.product_variants)
      ? item.product_variants[0]
      : item.product_variants;

    /* ✅ USE YOUR DB STRUCTURE */
    const basePrice = Number(
      variant?.base_price ?? product?.base_price ?? 0
    );

    const sellingPrice = Number(
      variant?.selling_price ?? product?.selling_price ?? 0
    );

    if (!sellingPrice || sellingPrice <= 0) {
      throw new Error("Invalid selling price");
    }

    const adminMargin = sellingPrice - basePrice;

    total += sellingPrice * item.quantity;

    return {
      product,
      variant,
      quantity: item.quantity,
      basePrice,
      sellingPrice,
      adminMargin,
      seller_id: product.seller_id,
    };
  });

  /* ============================= */
  /* 📦 CREATE ORDER */
  /* ============================= */
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      customer_id: user.id,
      total_amount: total,
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
    console.error("ORDER ERROR:", orderError);
    throw new Error("Order creation failed");
  }

  /* ============================= */
  /* 📦 INSERT ORDER ITEMS */
  /* ============================= */
  const items = normalized.map((i) => ({
    order_id: order.id,
    product_id: i.product.id,
    variant_id: i.variant?.id || null,
    quantity: i.quantity,

    /* ✅ IMPORTANT: USE EXISTING COLUMNS */
    base_price: i.basePrice,
    selling_price: i.sellingPrice,
    price: i.sellingPrice,

    seller_id: i.seller_id,
  }));

  const { error: itemError } = await supabaseAdmin
    .from("order_items")
    .insert(items);

  if (itemError) {
    console.error("ITEM ERROR:", itemError);
    throw new Error("Order items insert failed");
  }

  /* ============================= */
  /* 🧹 CLEAR CART */
  /* ============================= */
  await supabase.from("cart").delete().eq("user_id", user.id);

  /* ============================= */
  /* 📊 DEBUG LOGS */
  /* ============================= */
  const sellerTotal = items.reduce(
    (sum, i) => sum + Number(i.base_price) * i.quantity,
    0
  );

  const adminTotal = items.reduce(
    (sum, i) =>
      sum + (Number(i.selling_price) - Number(i.base_price)) * i.quantity,
    0
  );

  console.log("💰 SELLER PAYOUT:", sellerTotal);
  console.log("💸 ADMIN PROFIT:", adminTotal);

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
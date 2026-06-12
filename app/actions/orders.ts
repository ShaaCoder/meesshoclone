"use server";

import crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabase-admin";

import { getSupabaseServer } from "@/lib/supabase-server";

import {
  calculateCommission,
} from "@/services/commission-engine";

/* =======================================================
   🧠 TYPES
======================================================= */

type OrderInput = {
  paymentMethod:
    | "cod"
    | "online";

  addressId?: string;

  name?: string;

  phone?: string;

  address?: string;

  city?: string;

  state?: string;

  pincode?: string;
};

type OrderItemType = {
  product_id: string;

  variant_id: string;

  seller_id: string;

  quantity: number;

  cost_price: number;

  selling_price: number;

  seller_profit: number;

  platform_margin: number;

  gst_percent: number;

  gst_amount: number;

  shipping_fee: number;

  product_name: string;
};

/* =======================================================
   🔐 FRAUD CHECK
======================================================= */

function isSuspiciousOrder(
  data: OrderInput
) {
  const phone = String(
    data.phone || ""
  );

  const name = String(
    data.name || ""
  );

  const address = String(
    data.address || ""
  );

  if (
    !/^[6-9]\d{9}$/.test(
      phone
    )
  ) {
    return true;
  }

  if (name.length < 3) {
    return true;
  }

  if (address.length < 10) {
    return true;
  }

  return false;
}

/* =======================================================
   🛡️ COD CHECK
======================================================= */

async function checkCODEligibility(
  userId: string,
  supabase: any
) {
  const { data: user } =
    await supabase
      .from("users")
      .select(`
        cod_orders_count,
        rto_count,
        is_cod_blocked
      `)
      .eq("id", userId)
      .single();

  if (!user) {
    return {
      allowed: false,
    };
  }

  if (user.is_cod_blocked) {
    return {
      allowed: false,
    };
  }

  if (
    Number(
      user.rto_count || 0
    ) >= 3
  ) {
    return {
      allowed: false,
    };
  }

  return {
    allowed: true,
  };
}

/* =======================================================
   🔢 ORDER CODE
======================================================= */

function generateOrderCode() {
  return (
    "ORD-" +
    crypto.randomUUID()
      .slice(0, 8)
      .toUpperCase()
  );
}

/* =======================================================
   🚀 PLACE ORDER
======================================================= */

export async function placeOrder(
  data: OrderInput
) {
  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Unauthorized"
    );
  }

  /* =======================================================
     📍 ADDRESS
  ======================================================= */

  let addressId =
    data.addressId;

  if (!addressId) {

    const payload = {
      user_id: user.id,

      name: String(
        data.name || ""
      ).trim(),

      phone: String(
        data.phone || ""
      ).trim(),

      address_line: String(
        data.address || ""
      ).trim(),

      city: String(
        data.city || ""
      ).trim(),

      state: String(
        data.state || ""
      ).trim(),

      pincode: String(
        data.pincode || ""
      ).trim(),
    };

    if (
      !payload.name ||
      !payload.phone ||
      !payload.address_line ||
      !payload.city ||
      !payload.state ||
      payload.pincode.length < 6
    ) {
      throw new Error(
        "Select address or enter new address"
      );
    }

    if (
      data.paymentMethod ===
        "cod" &&
      isSuspiciousOrder({
        paymentMethod:
          data.paymentMethod,

        name: payload.name,

        phone:
          payload.phone,

        address:
          payload.address_line,
      })
    ) {
      throw new Error(
        "COD unavailable. Use online payment."
      );
    }

    const {
      data: insertedAddress,
      error: addressError,
    } = await supabase
      .from("addresses")
      .insert(payload)
      .select("id")
      .single();

    if (
      addressError ||
      !insertedAddress
    ) {

      console.error(
        "ADDRESS ERROR:",
        addressError
      );

      throw new Error(
        "Failed to save address"
      );
    }

    addressId =
      insertedAddress.id;
  }

  /* =======================================================
     🛡️ COD ELIGIBILITY
  ======================================================= */

  if (
    data.paymentMethod ===
    "cod"
  ) {

    const codCheck =
      await checkCODEligibility(
        user.id,
        supabase
      );

    if (!codCheck.allowed) {
      throw new Error(
        "COD not available for your account"
      );
    }
  }

  /* =======================================================
     🛒 FETCH CART
  ======================================================= */

  const {
    data: cart,
    error: cartError,
  } = await supabaseAdmin
    .from("cart")
    .select(`
      id,
      quantity,
      product_id,
      variant_id,

      products:product_id (
        id,
        name,
        slug,
        seller_id,
        status,
        approval_status,

        categories (
          gst_percent
        ),

        product_images (
          url,
          color,
          is_primary
        )
      ),

      product_variants:variant_id (
        id,
        stock,
        reserved_stock,

        cost_price,
        selling_price,
        seller_profit,
        platform_margin,

        mrp,
        size,
        color,
        attributes
      )
    `)
    .eq(
      "user_id",
      user.id
    );

  if (cartError) {

    console.error(
      "CART ERROR:",
      cartError
    );

    throw new Error(
      "Failed to fetch cart"
    );
  }

  if (!cart?.length) {
    throw new Error(
      "Cart empty"
    );
  }

  /* =======================================================
     🧠 TOTALS
  ======================================================= */

  let subtotal = 0;

  let gstTotal = 0;

  let shippingTotal = 0;

  let totalAmount = 0;

  let sellerPayout = 0;

  let platformProfit = 0;

  let totalCommission = 0;

  const items: OrderItemType[] =
    [];

  /* =======================================================
     🛒 PROCESS ITEMS
  ======================================================= */

  for (const cartItem of cart) {

    const product =
      Array.isArray(
        cartItem.products
      )
        ? cartItem.products[0]
        : cartItem.products;

    const variant =
      Array.isArray(
        cartItem.product_variants
      )
        ? cartItem
            .product_variants[0]
        : cartItem.product_variants;

    if (!product) {
      throw new Error(
        "Product not found"
      );
    }

    /* =======================================================
       ✅ PRODUCT VALIDATION
    ======================================================= */

    if (
      product.status !==
        "active" ||
      product.approval_status !==
        "approved"
    ) {
      throw new Error(
        `${product.name} unavailable`
      );
    }

    /* =======================================================
       ✅ VARIANT VALIDATION
    ======================================================= */

    if (!variant) {
      throw new Error(
        "Variant missing"
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
        cartItem.quantity
      )
    ) {
      throw new Error(
        `${product.name} out of stock`
      );
    }

    /* =======================================================
       CATEGORY
    ======================================================= */

    const category =
      Array.isArray(
        product.categories
      )
        ? product.categories[0]
        : product.categories;

    const gstPercent =
      Number(
        category?.gst_percent ||
          5
      );

    /* =======================================================
       PRICING
    ======================================================= */

    const quantity = Number(
      cartItem.quantity || 1
    );

    const costPrice =
      Number(
        variant.cost_price || 0
      );

    const sellingPrice =
      Number(
        variant.selling_price ||
          0
      );

    const sellerProfit =
      Number(
        variant.seller_profit ||
          0
      );

    const platformMargin =
      Number(
        variant.platform_margin ||
          0
      );

    /* =======================================================
       GST
    ======================================================= */

    const gstAmount =
      Math.round(
        (sellingPrice *
          gstPercent) / 100
      );

    const shippingFee = 0;

    const finalPrice =
      sellingPrice +
      gstAmount +
      shippingFee;

    /* =======================================================
       TOTALS
    ======================================================= */

    subtotal +=
      sellingPrice *
      quantity;

    gstTotal +=
      gstAmount *
      quantity;

    shippingTotal +=
      shippingFee *
      quantity;

    totalAmount +=
      finalPrice *
      quantity;

    sellerPayout +=
      (costPrice +
        sellerProfit) *
      quantity;

    platformProfit +=
      platformMargin *
      quantity;

    /* =======================================================
       COMMISSION
    ======================================================= */

    const commission =
      calculateCommission({
        category: "other",

        productPrice:
          sellingPrice,

        quantity,
      });

    totalCommission +=
      commission.totalCommission;

    /* =======================================================
       ITEMS
    ======================================================= */

    items.push({
      product_id:
        cartItem.product_id,

      variant_id:
        cartItem.variant_id,

      seller_id:
        product.seller_id,

      quantity,

      cost_price:
        costPrice,

      selling_price:
        sellingPrice,

      seller_profit:
        sellerProfit,

      platform_margin:
        platformMargin,

      gst_percent:
        gstPercent,

      gst_amount:
        gstAmount,

      shipping_fee:
        shippingFee,

      product_name:
        product.name,
    });
  }

  /* =======================================================
     SINGLE SELLER
  ======================================================= */

  const uniqueSellers = [
    ...new Set(
      items.map(
        (item) =>
          item.seller_id
      )
    ),
  ];

  if (
    uniqueSellers.length !== 1
  ) {
    throw new Error(
      "Multiple sellers in one order not supported yet"
    );
  }

  const sellerId =
    uniqueSellers[0];

  if (!sellerId) {
    throw new Error(
      "Seller not found"
    );
  }

/* =======================================================
   ORDER STATUS
======================================================= */

const orderStatus =
  "placed";

const paymentStatus =
  data.paymentMethod ===
  "online"
    ? "pending"
    : "pending";
  /* =======================================================
     CREATE ORDER
  ======================================================= */

  const orderCode =
    generateOrderCode();

  const {
    data: order,
    error: orderError,
  } = await supabaseAdmin
    .from("orders")
    .insert({
      order_code:
        orderCode,

      customer_id:
        user.id,

      seller_id:
        sellerId,

      address_id:
        addressId,

      total_amount:
        Math.round(
          totalAmount
        ),

      shipping_amount:
        Math.round(
          shippingTotal
        ),

      gst_amount:
        Math.round(
          gstTotal
        ),

      seller_payout:
        Math.round(
          sellerPayout
        ),

      platform_profit:
        Math.round(
          platformProfit
        ),

      commission_amount:
        Math.round(
          totalCommission
        ),

      payment_method:
        data.paymentMethod,

      payment_status:
        paymentStatus,

      status:
        orderStatus,

      is_cod:
        data.paymentMethod ===
        "cod",

      is_risky: false,
    })
    .select()
    .single();

  if (
    orderError ||
    !order
  ) {

    console.error(
      "ORDER ERROR:",
      orderError
    );

    throw new Error(
      "Failed to create order"
    );
  }

  /* =======================================================
     INSERT ORDER ITEMS
  ======================================================= */

  const {
    error: orderItemsError,
  } = await supabaseAdmin
    .from("order_items")
    .insert(
      items.map((item) => ({
        order_id: order.id,

        product_id:
          item.product_id,

        variant_id:
          item.variant_id,

        seller_id:
          item.seller_id,

        quantity:
          item.quantity,

        cost_price:
          item.cost_price,

        final_price:
          item.selling_price +
          item.gst_amount +
          item.shipping_fee,

        seller_earning:
          item.cost_price +
          item.seller_profit,

        platform_fee:
          item.platform_margin,

        shipping_fee:
          item.shipping_fee,

        gst_percent:
          item.gst_percent,

        gst_amount:
          item.gst_amount,

        product_name:
          item.product_name,

        status:
          orderStatus,
      }))
    );

  if (
    orderItemsError
  ) {

    console.error(
      "ORDER ITEMS ERROR:",
      orderItemsError
    );

    await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", order.id);

    throw new Error(
      "Failed to create order items"
    );
  }

  /* =======================================================
     STOCK RESERVE
  ======================================================= */

  if (
    data.paymentMethod ===
    "cod"
  ) {

    for (const item of items) {

      const {
        data: variant,
      } =
        await supabaseAdmin
          .from(
            "product_variants"
          )
          .select(`
            reserved_stock
          `)
          .eq(
            "id",
            item.variant_id
          )
          .single();

      if (!variant) {
        continue;
      }

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
    }
  }

  /* =======================================================
     COD COUNT
  ======================================================= */

  if (
    data.paymentMethod ===
    "cod"
  ) {

    const {
      data: userData,
    } =
      await supabaseAdmin
        .from("users")
        .select(
          "cod_orders_count"
        )
        .eq("id", user.id)
        .single();

    await supabaseAdmin
      .from("users")
      .update({
        cod_orders_count:
          Number(
            userData?.cod_orders_count ||
              0
          ) + 1,
      })
      .eq("id", user.id);
  }

  /* =======================================================
     CLEAR CART
  ======================================================= */

  if (
    data.paymentMethod ===
    "cod"
  ) {

    await supabase
      .from("cart")
      .delete()
      .eq(
        "user_id",
        user.id
      );
  }

  /* =======================================================
     RESPONSE
  ======================================================= */

  return {
    success: true,

    orderId: order.id,

    orderCode:
      order.order_code,

    totalAmount:
      Math.round(
        totalAmount
      ),

    subtotal:
      Math.round(
        subtotal
      ),

    gstTotal:
      Math.round(
        gstTotal
      ),

    shippingTotal:
      Math.round(
        shippingTotal
      ),
  };
}

async function syncMainOrderStatus(
  orderId: string
): Promise<void> {
  try {
    const { data: items, error } =
      await supabaseAdmin
        .from("order_items")
        .select("status")
        .eq("order_id", orderId);

    if (error || !items?.length) {
      console.error(error);
      return;
    }

    const statuses = items.map(
      (item) => item.status
    );

    let orderStatus:
      | "placed"
      | "accepted"
      | "shipped"
      | "out_for_delivery"
      | "delivered"
      | "cancelled" =
      "placed";

    /* ============================= */
    /* ✅ ALL CANCELLED */
    /* ============================= */

    if (
      statuses.every(
        (s) => s === "cancelled"
      )
    ) {
      orderStatus = "cancelled";
    }

    /* ============================= */
    /* ✅ ALL DELIVERED */
    /* ============================= */

    else if (
      statuses.every(
        (s) => s === "delivered"
      )
    ) {
      orderStatus = "delivered";
    }

    /* ============================= */
    /* 🚚 OUT FOR DELIVERY */
    /* ============================= */

    else if (
      statuses.some(
        (s) =>
          s ===
          "out_for_delivery"
      )
    ) {
      orderStatus =
        "out_for_delivery";
    }

    /* ============================= */
    /* 🚛 SHIPPED */
    /* ============================= */

    else if (
      statuses.some(
        (s) => s === "shipped"
      )
    ) {
      orderStatus = "shipped";
    }

    /* ============================= */
    /* 📦 ACCEPTED */
    /* ============================= */

    else if (
      statuses.some(
        (s) => s === "accepted"
      )
    ) {
      orderStatus = "accepted";
    }

    /* ============================= */
    /* 📦 DEFAULT */
    /* ============================= */

    else {
      orderStatus = "placed";
    }

    await supabaseAdmin
      .from("orders")
      .update({
        status: orderStatus,
      })
      .eq("id", orderId);
  } catch (err) {
    console.error(
      "SYNC ERROR:",
      err
    );
  }
}
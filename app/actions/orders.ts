"use server";

import crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServer } from "@/lib/supabase-server";

import { createShipment } from "@/services/shiprocket";

/* =======================================================
   🧠 TYPES
======================================================= */

type OrderInput = {
  paymentMethod: "cod" | "online";

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

  price: number;

  cost_price: number;

  gst_percent: number;

  gst_amount: number;

  shipping_fee: number;

  product_name: string;
};

type ShipmentResponse = {
  shipment_id?: string;

  awb_code?: string;

  courier_name?: string;

  tracking_url?: string;
};

/* =======================================================
   🔐 FRAUD CHECK
======================================================= */

function isSuspiciousOrder(data: OrderInput) {
  const phone = String(data.phone || "");

  const name = String(data.name || "");

  const address = String(data.address || "");

  if (!/^[6-9]\d{9}$/.test(phone)) {
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
   🛡️ COD ELIGIBILITY
======================================================= */

async function checkCODEligibility(
  userId: string,
  supabase: any
) {
  const { data: user } = await supabase
    .from("users")
    .select(`
      cod_orders_count,
      rto_count,
      is_cod_blocked
    `)
    .eq("id", userId)
    .single();

  if (!user) {
    return { allowed: false };
  }

  if (user.is_cod_blocked) {
    return { allowed: false };
  }

  if (Number(user.rto_count || 0) >= 3) {
    return { allowed: false };
  }

  if (
    Number(user.cod_orders_count || 0) >= 5
  ) {
    return { allowed: false };
  }

  return { allowed: true };
}

/* =======================================================
   🔢 ORDER CODE
======================================================= */

function generateOrderCode() {
  return (
    "ORD-" +
    crypto
      .randomUUID()
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
  } = await supabase.auth.getUser();

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

    /* =======================================================
       🚨 COD FRAUD CHECK
    ======================================================= */

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
     🛡️ COD CHECK
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
      quantity,
      product_id,
      variant_id,

      products:product_id (
        id,
        name,
        seller_id,
        status,
        approval_status,

        categories (
          gst_percent
        )
      ),

      product_variants:variant_id (
        id,
        stock,
        reserved_stock,
        cost_price,
        selling_price,
        platform_margin
      )
    `)
    .eq("user_id", user.id);

  if (cartError) {
    console.error(
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
     🧠 CALCULATIONS
  ======================================================= */

  let total = 0;

  let sellerPayout = 0;

  let platformProfit = 0;

  let isRisky = false;

  const items: OrderItemType[] =
    [];

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

    const sellingPrice =
      Number(
        variant.selling_price ||
          0
      ) ||
      Number(
        variant.cost_price || 0
      ) +
        Number(
          variant.platform_margin ||
            0
        );

    const costPrice =
      Number(
        variant.cost_price || 0
      );

    const category =
      Array.isArray(
        product.categories
      )
        ? product.categories[0]
        : product.categories;

    const gstPercent =
      Number(
        category?.gst_percent ||
          18
      );

    const gstAmount =
      Math.round(
        ((sellingPrice *
          gstPercent) /
          100) *
          Number(
            cartItem.quantity
          )
      );

    const shippingFee = 0;

    total +=
      sellingPrice *
        Number(
          cartItem.quantity
        ) +
      gstAmount +
      shippingFee;

    sellerPayout +=
      costPrice *
      Number(
        cartItem.quantity
      );

    platformProfit +=
      (sellingPrice -
        costPrice) *
      Number(
        cartItem.quantity
      );

    items.push({
      product_id:
        cartItem.product_id,

      variant_id:
        cartItem.variant_id,

      seller_id:
        product.seller_id,

      quantity: Number(
        cartItem.quantity
      ),

      price: sellingPrice,

      cost_price:
        costPrice,

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
     🏪 SINGLE SELLER CHECK
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
     🧾 CREATE ORDER
  ======================================================= */

  const orderCode =
    generateOrderCode();
const initialStatus = "placed";

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
        Math.round(total),

      seller_payout:
        Math.round(
          sellerPayout
        ),

      platform_profit:
        Math.round(
          platformProfit
        ),

      payment_method:
        data.paymentMethod,

      payment_status:
        "unpaid",

      status:
        initialStatus,

      is_cod:
        data.paymentMethod ===
        "cod",

      is_risky:
        isRisky,
    })
    .select()
    .single();

  if (
    orderError ||
    !order
  ) {
    console.error(
      orderError
    );

    throw new Error(
      "Failed to create order"
    );
  }

  /* =======================================================
     📦 INSERT ORDER ITEMS
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
          item.price,

        platform_fee:
          Math.max(
            item.price -
              item.cost_price,
            0
          ),

        shipping_fee:
          item.shipping_fee,

        gst_percent:
          item.gst_percent,

        gst_amount:
          item.gst_amount,

        product_name:
          item.product_name,

        status:
          initialStatus,
      }))
    );

  if (
    orderItemsError
  ) {
    console.error(
      orderItemsError
    );

    /* =======================================================
       ❌ ROLLBACK
    ======================================================= */

    await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", order.id);

    throw new Error(
      "Failed to create order items"
    );
  }

  /* =======================================================
     🔒 RESERVE STOCK
  ======================================================= */

  for (const item of items) {
    const {
      data: variant,
    } =
      await supabaseAdmin
        .from(
          "product_variants"
        )
        .select(`
          stock,
          reserved_stock
        `)
        .eq(
          "id",
          item.variant_id
        )
        .single();

    if (!variant) {
      throw new Error(
        "Variant not found"
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
      item.quantity
    ) {
      /* =======================================================
         ❌ ROLLBACK
      ======================================================= */

      await supabaseAdmin
        .from("orders")
        .delete()
        .eq(
          "id",
          order.id
        );

      throw new Error(
        "Insufficient stock"
      );
    }

    const {
      error: stockError,
    } =
      await supabaseAdmin
        .from(
          "product_variants"
        )
        .update({
          reserved_stock:
            Number(
              variant.reserved_stock ||
                0
            ) +
            item.quantity,
        })
        .eq(
          "id",
          item.variant_id
        );

    if (stockError) {
      console.error(
        stockError
      );

      throw new Error(
        "Failed to reserve stock"
      );
    }
  }

  /* =======================================================
     📈 COD COUNT
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
        .eq(
          "id",
          user.id
        )
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
     🧹 CLEAR CART
  ======================================================= */

  await supabase
    .from("cart")
    .delete()
    .eq("user_id", user.id);

  /* =======================================================
     ✅ RESPONSE
  ======================================================= */

  return {
    success: true,

    orderId:
      order.id,

    orderCode:
      order.order_code,
  };
}

/* =======================================================
   🚚 CREATE SHIPMENT
======================================================= */

export async function createOrderShipment(
  orderId: string
) {
  const {
    data: order,
    error,
  } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      addresses (*),

      order_items (
        *,
        products (
          id,
          name
        )
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Error(
      "Order not found"
    );
  }

  /* =======================================================
     🚫 DUPLICATE CHECK
  ======================================================= */

  const {
    data: existingShipment,
  } = await supabaseAdmin
  .from("order_items")
  .update({
    status: "shipped",

    shipped_at:
      new Date().toISOString(),
  })
  .eq("order_id", orderId);
    

  if (existingShipment) {
    throw new Error(
      "Shipment already exists"
    );
  }

  /* =======================================================
     🚚 CREATE SHIPMENT
  ======================================================= */

  const shipment: ShipmentResponse =
    await createShipment({
      ...order,

      shipping_address: {
        name:
          order.addresses?.name,

        phone:
          order.addresses?.phone,

        address:
          order.addresses
            ?.address_line,

        city:
          order.addresses?.city,

        state:
          order.addresses?.state,

        pincode:
          order.addresses
            ?.pincode,
      },

      items:
        order.order_items?.map(
          (item: any) => ({
            name:
              item.products
                ?.name ||
              "Product",

            quantity:
              item.quantity,

            price:
              item.final_price,
          })
        ),
    });

  if (!shipment) {
    throw new Error(
      "Shipment creation failed"
    );
  }

  /* =======================================================
     💾 SAVE SHIPMENT
  ======================================================= */
await supabaseAdmin
  .from("shipments")
  .insert({
    order_id: orderId,

    awb_code:
      shipment.awb_code ||
      null,

    courier_name:
      shipment.courier_name ||
      "Shiprocket",

    tracking_url:
      shipment.tracking_url ||
      null,

    status: "shipped",

    shipped_at:
      new Date().toISOString(),
  });


  await supabaseAdmin
  .from("order_items")
  .update({
    status: "shipped",

    shipped_at:
      new Date().toISOString(),
  })
  .eq("order_id", orderId);

  /* =======================================================
     📦 UPDATE ORDER
  ======================================================= */

  await supabaseAdmin
    .from("orders")
    .update({
      shipment_id:
        shipment.shipment_id ||
        null,

      awb_code:
        shipment.awb_code ||
        null,

      courier_name:
        shipment.courier_name ||
        "Shiprocket",

      tracking_url:
        shipment.tracking_url ||
        null,

      status: "shipped",
    })
    .eq("id", orderId);

  return {
    success: true,

    shipment,
  };
}

/* =======================================================
   ✅ MARK ORDER DELIVERED
======================================================= */

export async function markOrderDelivered(
  orderId: string
) {
  /* =======================================================
     📦 FETCH ORDER
  ======================================================= */

  const { data: order } =
    await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

  if (!order) {
    throw new Error(
      "Order not found"
    );
  }

  /* =======================================================
     📦 FETCH ITEMS
  ======================================================= */

  const { data: items } =
    await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

  /* =======================================================
     📦 UPDATE STOCK
  ======================================================= */

  for (const item of items || []) {

    const { data: variant } =
      await supabaseAdmin
        .from(
          "product_variants"
        )
        .select(`
          stock,
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
        stock: Math.max(
          Number(
            variant.stock || 0
          ) - item.quantity,
          0
        ),

        reserved_stock:
          Math.max(
            Number(
              variant.reserved_stock ||
                0
            ) - item.quantity,
            0
          ),
      })
      .eq(
        "id",
        item.variant_id
      );
  }

  /* =======================================================
     📅 DELIVERY DATE
  ======================================================= */

  const deliveredAt =
    new Date();

  /* =======================================================
     🛡️ RETURN WINDOW
  ======================================================= */

  const returnDeadline =
    new Date();

  returnDeadline.setDate(
    returnDeadline.getDate() + 7
  );

  /* =======================================================
     💰 PAYOUT RELEASE DATE
  ======================================================= */

  const payoutReleaseDate =
    new Date();

  payoutReleaseDate.setDate(
    payoutReleaseDate.getDate() + 7
  );

  /* =======================================================
     ✅ UPDATE ORDER
  ======================================================= */

  const updatePayload: any = {
    status: "delivered",

    delivered_at:
      deliveredAt.toISOString(),

    return_deadline:
      returnDeadline.toISOString(),

    payout_release_at:
      payoutReleaseDate.toISOString(),

    seller_paid: false,
  };

  /* =======================================================
     💵 COD AUTO PAID
  ======================================================= */

  if (
    order.payment_method ===
    "cod"
  ) {
    updatePayload.payment_status =
      "paid";
  }

  await supabaseAdmin
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId);

  /* =======================================================
     📦 UPDATE ORDER ITEMS
  ======================================================= */

  await supabaseAdmin
    .from("order_items")
    .update({
      status: "delivered",

      delivered_at:
        deliveredAt.toISOString(),
    })
    .eq("order_id", orderId);

  /* =======================================================
     🚚 UPDATE SHIPMENT
  ======================================================= */

  await supabaseAdmin
    .from("shipments")
    .update({
      status: "delivered",

      delivered_at:
        deliveredAt.toISOString(),
    })
    .eq("order_id", orderId);

  /* =======================================================
     🔄 SYNC ORDER STATUS
  ======================================================= */

  await syncMainOrderStatus(
    orderId
  );

  return {
    success: true,
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
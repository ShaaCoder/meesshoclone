"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createShipment, assignCourier } from "@/services/shiprocket";
import { revalidatePath } from "next/cache";
import {
  approveWithdrawRequest,
  rejectWithdrawRequest,
} from "@/services/wallet-engine";

import {
  createSellerSettlement,
  releaseSellerSettlement,
} from "@/services/settlement-engine";
/* ============================= */
/* 📦 PRODUCT APPROVAL */
/* ============================= */

export async function approveProduct(productId: string) {
  const admin = await requireAdmin();

  const { error } = await supabaseAdmin
    .from("products")
    .update({
      approval_status: "approved",

      // 🔥 IMPORTANT (fix your bug)
      status: "active",

      approved_at: new Date().toISOString(),
      approved_by: admin.id,
    })
    .eq("id", productId);

  if (error) {
    console.error("APPROVE ERROR:", error);
    throw new Error(error.message);
  }

  return { success: true };
}

export async function rejectProduct(productId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("products")
    .update({
      approval_status: "rejected",
     status: "inactive" // optional but recommended
    })
    .eq("id", productId);

  if (error) {
    console.error("REJECT ERROR:", error);
    throw new Error(error.message);
  }

  return { success: true };
}
/* ============================= */
/* 🔐 ADMIN CHECK */
/* ============================= */
async function requireAdmin() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized");
  }

  return user;
}

/* ============================= */
/* 👤 USER MANAGEMENT */
/* ============================= */

export async function updateUserRole(userId: string, role: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();

  if (admin.id === userId) {
    throw new Error("You cannot delete yourself");
  }

  const { error } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function updateUserStatus(userId: string, status: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("users")
    .update({ status })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

/* ============================= */
/* 📦 PRODUCT APPROVAL SYSTEM */
/* ============================= */
/* 🚀 SINGLE SOURCE OF TRUTH */

export async function updateProductApproval(
  productId: string,
  action: "approved" | "rejected"
) {
  const admin = await requireAdmin();

  let updateData: any = {
    approval_status: action,
  };

  if (action === "approved") {
    updateData.status = "active";
    updateData.approved_at = new Date().toISOString();
    updateData.approved_by = admin.id;
  }

  if (action === "rejected") {
    updateData.status = "inactive";
  }

  const { error } = await supabaseAdmin
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error) throw new Error(error.message);

  return { success: true };
}

/* ============================= */
/* 🛍 PRODUCT MANUAL STATUS */
/* ============================= */
/* (for admin toggle active/inactive later) */

export async function updateProductVisibility(
  productId: string,
  status: "active" | "inactive" | "deleted"
) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("products")
    .update({ status })
    .eq("id", productId);

  if (error) throw new Error(error.message);
}

export async function approveWithdraw(
  id: string
) {
  await requireAdmin();

  try {

    /* ============================= */
    /* APPROVE REQUEST */
    /* ============================= */

    await approveWithdrawRequest({
      withdrawRequestId: id,
    });

    /* ============================= */
    /* FORCE STATUS = APPROVED */
    /* IMPORTANT FIX */
    /* ============================= */

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("withdraw_requests")
      .update({
        status: "approved",

        approved_at:
          new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    console.log(
      "✅ WITHDRAW APPROVED"
    );

    /* ============================= */
    /* REVALIDATE */
    /* ============================= */

    revalidatePath(
      "/dashboard/admin/withdraw"
    );

    revalidatePath(
      "/dashboard/seller/wallet"
    );

    return {
      success: true,
    };

  } catch (error: any) {

    console.error(
      "APPROVE WITHDRAW ERROR:",
      error
    );

    throw new Error(
      error?.message ||
      "Failed to approve withdraw"
    );
  }
}

/* ============================= */
/* ❌ REJECT WITHDRAW */
/* ============================= */

export async function rejectWithdraw(
  id: string
) {
  await requireAdmin();

  try {

    await rejectWithdrawRequest({
      withdrawRequestId: id,
    });

    revalidatePath(
      "/dashboard/admin/withdraws"
    );

    revalidatePath(
      "/dashboard/seller/wallet"
    );

    return {
      success: true,
    };

  } catch (error: any) {

    console.error(
      "REJECT WITHDRAW ERROR:",
      error
    );

    throw new Error(
      error?.message ||
      "Failed to reject withdraw"
    );
  }
}

export async function markWithdrawPaid(id: string) {
  await requireAdmin();

  const { data: request } = await supabaseAdmin
    .from("withdraw_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) throw new Error("Request not found");

  if (request.status !== "approved") {
    throw new Error("Only approved payouts can be marked paid");
  }

  await supabaseAdmin
    .from("withdraw_requests")
    .update({ status: "paid" })
    .eq("id", id);
}

/* ============================= */
/* 🚚 SHIPPING */
/* ============================= */

/* ============================= */
/* 🚚 CREATE SHIPMENT BY ADMIN */
/* ============================= */
const USE_FAKE_SHIPPING =
  process.env
    .USE_FAKE_SHIPPING ===
  "true";



/* ============================= */
/* 🚚 CREATE SHIPMENT FOR ORDER */
/* AUTO AFTER SELLER ACCEPT */
/* ============================= */

export async function createShipmentForOrder(
  orderId: string
) {
  try {
    /* ============================= */
    /* 📦 FETCH ORDER */
    /* ============================= */

    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(
        "ORDER ERROR:",
        orderError
      );

      throw new Error(
        "Order not found"
      );
    }

    /* ============================= */
    /* 🚫 VALID STATUS */
    /* ============================= */

    if (
      order.status !==
      "processing"
    ) {
      throw new Error(
        "Order must be processing"
      );
    }

    /* ============================= */
    /* 🚫 DUPLICATE SHIPMENT */
    /* ============================= */

    if (
      order.shipment_id ||
      order.awb_code
    ) {
      throw new Error(
        "Shipment already created"
      );
    }

    /* ============================= */
    /* 👤 FETCH CUSTOMER */
    /* ============================= */

    const {
      data: customer,
      error: customerError,
    } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq(
        "id",
        order.customer_id
      )
      .single();

    if (
      customerError ||
      !customer
    ) {
      throw new Error(
        "Customer not found"
      );
    }

    /* ============================= */
    /* 🏠 FETCH ADDRESS */
    /* ============================= */

    const {
      data: address,
      error: addressError,
    } = await supabaseAdmin
      .from("addresses")
      .select("*")
      .eq(
        "id",
        order.address_id
      )
      .single();

    if (
      addressError ||
      !address
    ) {
      throw new Error(
        "Address not found"
      );
    }

    /* ============================= */
    /* 📦 FETCH ORDER ITEMS */
    /* ============================= */

    const {
      data: items,
      error: itemsError,
    } = await supabaseAdmin
      .from("order_items")
      .select(`
        *,
        products (
          id,
          name,
          seller_id
        )
      `)
      .eq(
        "order_id",
        orderId
      );

    if (
      itemsError ||
      !items?.length
    ) {
      throw new Error(
        "No order items found"
      );
    }

    /* ============================= */
    /* 🚫 VALIDATE ITEMS */
    /* ============================= */

    const invalidItem =
      items.find(
        (item: any) =>
          item.status !==
          "processing"
      );

    if (invalidItem) {
      throw new Error(
        "Items not processing"
      );
    }

    /* ============================= */
    /* 🏭 SELLER */
    /* ============================= */

    const sellerId =
      items[0]?.seller_id;

    if (!sellerId) {
      throw new Error(
        "Seller not found"
      );
    }

    /* ============================= */
    /* 🏠 SELLER ADDRESS */
    /* ============================= */

    const {
      data: sellerAddress,
      error: sellerError,
    } = await supabaseAdmin
      .from("seller_addresses")
      .select("*")
      .eq(
        "seller_id",
        sellerId
      )
      .eq(
        "is_default",
        true
      )
      .maybeSingle();

    if (
      sellerError ||
      !sellerAddress
    ) {
      throw new Error(
        "Seller pickup address missing"
      );
    }

    /* ============================= */
    /* 📦 SHIPMENT ITEMS */
    /* ============================= */

    const shipmentItems =
      items.map(
        (item: any) => ({
          id: item.id,

          quantity: Number(
            item.quantity || 1
          ),

          final_price: Number(
            item.final_price || 0
          ),

          product_name:
            item.products?.name ||
            "Product",

          product_id:
            item.product_id,
        })
      );

    /* ============================= */
    /* 🚚 CREATE SHIPMENT */
    /* ============================= */

    let shipment: any;

    if (USE_FAKE_SHIPPING) {
      shipment = {
        shipment_id:
          "FAKE-" + Date.now(),

        awb_code:
          "AWB-" +
          Math.floor(
            Math.random() *
              1000000
          ),

        courier_name:
          "Fake Express",

        tracking_url:
          `https://tracking.fake/${order.id}`,
      };
    } else {
      shipment =
        await createShipment({
          order,
          customer,
          address,
          items:
            shipmentItems,
          seller:
            sellerAddress,
        });
    }

    if (!shipment) {
      throw new Error(
        "Shipment creation failed"
      );
    }

    console.log(
      "SHIPMENT SUCCESS:",
      shipment
    );

    /* ============================= */
    /* 🧠 STATUS */
    /* ============================= */

    const orderStatus =
      "processing";

    /* ============================= */
    /* ✅ UPDATE ORDER */
    /* ============================= */

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        shipment_id:
          shipment.shipment_id,

        awb_code:
          shipment.awb_code,

        courier_name:
          shipment.courier_name,

        tracking_url:
          shipment.tracking_url,

        shipment_error:
          null,

        status:
          orderStatus,
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    /* ============================= */
    /* ✅ UPDATE ITEMS */
    /* ============================= */

    const {
      error:
        orderItemsError,
    } = await supabaseAdmin
      .from("order_items")
      .update({
        status:
          orderStatus,
      })
      .eq(
        "order_id",
        orderId
      );

    if (
      orderItemsError
    ) {
      throw new Error(
        orderItemsError.message
      );
    }

    /* ============================= */
    /* 🤖 DEV AUTO FLOW */
    /* ============================= */

    if (
      USE_FAKE_SHIPPING
    ) {
     
   
   

   
    }

    /* ============================= */
    /* ♻️ REVALIDATE */
    /* ============================= */

    revalidatePath(
      "/dashboard/admin/orders"
    );

    revalidatePath(
      "/dashboard/seller/orders"
    );

    revalidatePath(
      "/dashboard/user/orders"
    );

    /* ============================= */
    /* ✅ SUCCESS */
    /* ============================= */

    return {
      success: true,

      shipment_id:
        shipment.shipment_id,

      awb_code:
        shipment.awb_code,

      tracking_url:
        shipment.tracking_url,

      courier_name:
        shipment.courier_name,

      status:
        orderStatus,
    };
  } catch (err: any) {
    console.error(
      "SHIPMENT ERROR:",
      err
    );

    await supabaseAdmin
      .from("orders")
      .update({
        shipment_error:
          err?.message ||
          "Shipment failed",
      })
      .eq("id", orderId);

    throw new Error(
      err?.message ||
        "Shipment creation failed"
    );
  }
}


/* ============================= */
/* 🚚 RETRY COURIER ASSIGN */
/* ============================= */

export async function retryCourierAssign(
  orderId: string
) {
  await requireAdmin();

  try {
    /* ============================= */
    /* 📦 FETCH ORDER */
    /* ============================= */

    const {
      data: order,
      error,
    } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      throw new Error(
        "Order not found"
      );
    }

    if (!order.shipment_id) {
      throw new Error(
        "Shipment ID missing"
      );
    }

    /* ============================= */
    /* 🚛 ASSIGN COURIER */
    /* ============================= */

    const courier =
      await assignCourier(
        order.shipment_id
      );

    /* ============================= */
    /* ✅ UPDATE ORDER */
    /* ============================= */

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        awb_code:
          courier.awb_code,

        courier_name:
          courier.courier_name,

        tracking_url:
          courier.tracking_url,

        status: "shipped",

        shipped_at:
          new Date().toISOString(),

        shipment_error:
          null,
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    /* ============================= */
    /* ✅ UPDATE ORDER ITEMS */
    /* ============================= */

    await supabaseAdmin
      .from("order_items")
      .update({
        status: "shipped",

        shipped_at:
          new Date().toISOString(),
      })
      .eq("order_id", orderId);

    /* ============================= */
    /* ♻️ REVALIDATE */
    /* ============================= */

    revalidatePath(
      "/dashboard/admin/orders"
    );

    revalidatePath(
      "/dashboard/seller/orders"
    );

    revalidatePath(
      "/dashboard/user/orders"
    );

    return {
      success: true,

      awb_code:
        courier.awb_code,

      tracking_url:
        courier.tracking_url,
    };
  } catch (e: any) {
    console.error(
      "RETRY COURIER ERROR:",
      e
    );

    throw new Error(
      e?.message ||
        "Courier retry failed"
    );
  }
}
/* ============================= */
/* 💳 BANK */
/* ============================= */

export async function verifyBankAccount(sellerId: string) {
  await requireAdmin();

  await supabaseAdmin
    .from("bank_accounts")
    .update({ is_verified: true })
    .eq("seller_id", sellerId);
}

/* ============================= */
/* 📦 DELIVERY + WALLET HOLD */
/* ============================= */

async function deliverOrderInternal(
  orderId: string
) {

  /* ============================= */
  /* 📦 FETCH ORDER */
  /* ============================= */

  const {
    data: order,
    error: orderError,
  } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (
    orderError ||
    !order
  ) {

    console.error(
      "❌ DELIVERY ORDER ERROR:",
      orderError
    );

    throw new Error(
      "Order not found"
    );
  }

  console.log(
    "📦 ORDER FOUND:",
    order.id
  );

  /* ============================= */
  /* 🚫 PREVENT DUPLICATE DELIVERY */
  /* ============================= */

  if (
    order.status ===
    "delivered"
  ) {

    console.log(
      "⚠️ ORDER ALREADY DELIVERED"
    );

    return {
      success: true,
    };
  }

  /* ============================= */
  /* 📦 FETCH ORDER ITEMS */
  /* ============================= */

  const {
    data: items,
    error: itemsError,
  } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (itemsError) {

    console.error(
      "❌ ITEMS ERROR:",
      itemsError
    );

    throw new Error(
      "Failed to fetch order items"
    );
  }

  console.log(
    "📦 ORDER ITEMS:",
    items?.length || 0
  );

  const now =
    new Date().toISOString();

  /* ============================= */
  /* ⏳ 7 DAYS HOLD */
  /* ============================= */

  const payoutReleaseAt =
    new Date(
      Date.now() +
        7 *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  /* ============================= */
  /* ✅ UPDATE ORDER ITEMS */
  /* ============================= */

  const {
    error: orderItemsError,
  } = await supabaseAdmin
    .from("order_items")
    .update({
      status: "delivered",

      delivered_at: now,
    })
    .eq("order_id", orderId);

  if (orderItemsError) {

    console.error(
      "❌ ORDER ITEMS UPDATE ERROR:",
      orderItemsError
    );

    throw new Error(
      "Failed to update order items"
    );
  }

  console.log(
    "✅ ORDER ITEMS UPDATED"
  );

  /* ============================= */
  /* ✅ UPDATE MAIN ORDER */
  /* ============================= */

  const {
    error: updateOrderError,
  } = await supabaseAdmin
    .from("orders")
    .update({
      status: "delivered",

      delivered_at: now,

      payment_status:
        order.payment_method ===
        "cod"
          ? "paid"
          : order.payment_status,

      payout_release_at:
        payoutReleaseAt,

      seller_paid: false,
    })
    .eq("id", orderId);

  if (updateOrderError) {

    console.error(
      "❌ ORDER UPDATE ERROR:",
      updateOrderError
    );

    throw new Error(
      "Failed to update order"
    );
  }

  console.log(
    "✅ ORDER UPDATED"
  );

  /* ============================= */
  /* 🚚 UPDATE SHIPMENT */
  /* ============================= */

  const {
    error: shipmentError,
  } = await supabaseAdmin
    .from("shipments")
    .update({
      status: "delivered",

      delivered_at: now,
    })
    .eq("order_id", orderId);

  if (shipmentError) {

    console.error(
      "⚠️ SHIPMENT UPDATE ERROR:",
      shipmentError
    );

  } else {

    console.log(
      "✅ SHIPMENT UPDATED"
    );
  }

 /* ============================= */
/* 💰 CREATE SELLER SETTLEMENT */
/* ============================= */

try {

  const sellerPayout =
    Number(
      order.seller_payout || 0
    );

  console.log(
    "💰 SELLER PAYOUT:",
    sellerPayout
  );

  if (
    sellerPayout > 0 &&
    order.seller_id
  ) {

    

    /* ============================= */
    /* 🧾 CREATE SETTLEMENT */
    /* ============================= */
    const existingSettlement =
  await supabaseAdmin
    .from("settlements")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

if (existingSettlement.data) {
  console.log(
    "⚠️ DELIVERY ALREADY PROCESSED"
  );

  return {
    success: true,
    message:
      "Settlement already exists",
  };
}

    await createSellerSettlement({
      orderId:
        order.id,

      sellerId:
        order.seller_id,

      amount:
        sellerPayout,

      releaseAt:
        payoutReleaseAt,
    });

    console.log(
      "✅ SELLER SETTLEMENT CREATED"
    );

  } else {

    console.log(
      "⚠️ NO SELLER PAYOUT"
    );
  }

} catch (settlementError) {

  console.error(
    "❌ SETTLEMENT ERROR:",
    settlementError
  );
}

  /* ============================= */
  /* ♻️ REVALIDATE */
  /* ============================= */

  revalidatePath(
    "/dashboard/admin/orders"
  );

  revalidatePath(
    "/dashboard/seller/orders"
  );

  revalidatePath(
    "/dashboard/seller/wallet"
  );

  revalidatePath(
    "/dashboard/user/orders"
  );

  console.log(
    "✅ ORDER DELIVERED"
  );

  console.log(
    "💰 PAYOUT RELEASED"
  );

  return {
    success: true,

    payout_release_at:
      payoutReleaseAt,
  };
}
export async function markOrderDelivered(
  orderId: string
) {
  await requireAdmin();

  return {
  success: true,
};
  /* ============================= */
/* 🔒 LOCK SELLER AMOUNT */
/* ============================= */

await supabaseAdmin
  .from("orders")
  .update({
    seller_paid: false,
  })
  .eq("id", orderId);
}
/* ============================= */
/* 📦 ADMIN ORDER STATUS UPDATE */
/* ============================= */

/* ============================= */
/* 🔒 INTERNAL ORDER UPDATE */
/* ============================= */

async function updateOrderStatusInternal(
  orderId: string,
  newStatus:
    | "shipped"
    | "out_for_delivery"
    | "delivered"
) {

  const now =
    new Date().toISOString();

  const updateData: any = {
    status: newStatus,
  };

  /* ============================= */
  /* 🕒 TIMESTAMPS */
  /* ============================= */

  if (newStatus === "shipped") {
    updateData.shipped_at = now;
  }

  if (
    newStatus ===
    "out_for_delivery"
  ) {
    updateData.out_for_delivery_at =
      now;
  }

  /* ============================= */
  /* 💰 HANDLE DELIVERY */
  /* ============================= */

  if (
    newStatus === "delivered"
  ) {

    console.log(
      "🚚 DELIVERING ORDER:",
      orderId
    );

    return await deliverOrderInternal(
      orderId
    );
  }

  /* ============================= */
  /* ✅ UPDATE ORDER ITEMS */
  /* ============================= */

  const {
    error: itemsError,
  } = await supabaseAdmin
    .from("order_items")
    .update(updateData)
    .eq("order_id", orderId);

  if (itemsError) {
    console.error(itemsError);

    throw new Error(
      itemsError.message
    );
  }

  /* ============================= */
  /* ✅ UPDATE MAIN ORDER */
  /* ============================= */

  const {
    error: orderError,
  } = await supabaseAdmin
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (orderError) {
    console.error(orderError);

    throw new Error(
      orderError.message
    );
  }

  /* ============================= */
  /* ♻️ REVALIDATE */
  /* ============================= */

  revalidatePath(
    "/dashboard/admin/orders"
  );

  revalidatePath(
    "/dashboard/seller/orders"
  );

  revalidatePath(
    "/dashboard/user/orders"
  );

  return {
    success: true,
  };
}

/* ============================= */
/* 👮 ADMIN WRAPPER */
/* ============================= */

export async function updateOrderStatusByAdmin(
  orderId: string,
  newStatus:
    | "shipped"
    | "out_for_delivery"
    | "delivered"
) {

  await requireAdmin();

  return await updateOrderStatusInternal(
    orderId,
    newStatus
  );
}
/* ============================= */
/* 💸 SELLER PAYMENT */
/* ============================= */


export async function markSellerPaid(
  orderId: string
) {
  await requireAdmin();

  /* ============================= */
  /* 📦 FETCH ORDER */
  /* ============================= */

  const {
    data: order,
    error,
  } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      settlements (
        id,
        status,
        amount,
        release_date
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) {
    console.error(
      "❌ ORDER FETCH ERROR:",
      error
    );

    throw new Error(
      "Order not found"
    );
  }

  /* ============================= */
  /* 🔐 VALIDATIONS */
  /* ============================= */

  if (
    order.payment_status !==
    "paid"
  ) {
    throw new Error(
      "Order payment pending"
    );
  }

  if (
    order.status !==
    "delivered"
  ) {
    throw new Error(
      "Order not delivered"
    );
  }

  if (order.seller_paid) {
    throw new Error(
      "Seller already paid"
    );
  }

  if (!order.seller_id) {
    throw new Error(
      "Seller not found"
    );
  }

  /* ============================= */
  /* 📦 FETCH SETTLEMENT */
  /* ============================= */

  const {
    data: settlement,
    error: settlementError,
  } = await supabaseAdmin
    .from("settlements")
    .select("*")
    .eq("order_id", order.id)
    .maybeSingle();

  if (
    settlementError ||
    !settlement
  ) {
    console.error(
      "❌ SETTLEMENT ERROR:",
      settlementError
    );

    throw new Error(
      "Settlement not found"
    );
  }

  /* ============================= */
  /* 🚫 ALREADY RELEASED */
  /* ============================= */

  if (
    settlement.status ===
    "released"
  ) {
    throw new Error(
      "Settlement already released"
    );
  }

  /* ============================= */
  /* ⏳ HOLD WINDOW CHECK */
  /* ============================= */

  if (
    settlement.release_date &&
    new Date(
      settlement.release_date
    ) > new Date()
  ) {
    throw new Error(
      "Settlement hold period active"
    );
  }

  /* ============================= */
  /* 💰 RELEASE SETTLEMENT */
  /* ============================= */

  await releaseSellerSettlement(
    settlement.id
  );

  /* ============================= */
  /* ♻️ REVALIDATE */
  /* ============================= */

  revalidatePath(
    "/dashboard/admin/orders"
  );

  revalidatePath(
    "/dashboard/admin/settlements"
  );

  revalidatePath(
    "/dashboard/seller/orders"
  );

  revalidatePath(
    "/dashboard/seller/wallet"
  );

  console.log(
    "✅ SELLER PAYMENT RELEASED:",
    order.id
  );

  return {
    success: true,
  };
}



/* ============================= */
/* 💸 MARK REFUND PROCESSED */
/* ============================= */
export async function markRefundProcessed(
  returnId: string
) {
  const supabase = await getSupabaseServer();

  /* ============================= */
  /* UPDATE RETURN */
  /* ============================= */

  const { error } = await supabase
    .from("returns")
    .update({
      refund_status: "processed",

      refund_released: true,

      refund_processed_at:
        new Date().toISOString(),

      status: "completed",
    })
    .eq("id", returnId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/admin/returns");
}


// approveSellerVerification()
// rejectSellerVerification()

/* ============================= */
/* ✅ APPROVE SELLER */
/* ============================= */

export async function approveSellerVerification(
  sellerId: string
) {
  await requireAdmin();

  await supabaseAdmin
    .from("seller_documents")
    .update({
      verification_status:
        "approved",

      verified_at:
        new Date().toISOString(),
    })
    .eq(
      "seller_id",
      sellerId
    );

  await supabaseAdmin
    .from("users")
    .update({
      seller_verified: true,
    })
    .eq("id", sellerId);

  revalidatePath(
    "/dashboard/admin/seller-verification"
  );

  return {
    success: true,
  };
}
/* ============================= */
/* ❌ REJECT SELLER */
/* ============================= */

export async function rejectSellerVerification(
  sellerId: string,
  reason: string
) {
  await requireAdmin();

  await supabaseAdmin
    .from("seller_documents")
    .update({
      verification_status:
        "rejected",

      rejection_reason:
        reason,

      verified_at: null,
    })
    .eq(
      "seller_id",
      sellerId
    );

  await supabaseAdmin
    .from("users")
    .update({
      seller_verified: false,
    })
    .eq("id", sellerId);

  revalidatePath(
    "/dashboard/admin/seller-verification"
  );

  return {
    success: true,
  };
}
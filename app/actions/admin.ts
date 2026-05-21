"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createShipment, assignCourier } from "@/services/shiprocket";
import { revalidatePath } from "next/cache";
import {
  releaseWalletBalance,
} from "@/app/actions/wallet";
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

/* ============================= */
/* 💸 WITHDRAW SYSTEM */
/* ============================= */

export async function approveWithdraw(
  id: string
) {
  await requireAdmin();

  /* ============================= */
  /* 📦 GET REQUEST */
  /* ============================= */

  const { data: withdraw, error } =
    await supabaseAdmin
      .from("withdraw_requests")
      .select("*")
      .eq("id", id)
      .single();

  if (error || !withdraw) {
    throw new Error(
      "Withdraw request not found"
    );
  }

  if (withdraw.status !== "pending") {
    throw new Error(
      "Withdraw already processed"
    );
  }

  /* ============================= */
  /* 💰 GET WALLET */
  /* ============================= */

  const { data: wallet } =
    await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq(
        "seller_id",
        withdraw.seller_id
      )
      .single();

  if (!wallet) {
    throw new Error(
      "Wallet not found"
    );
  }

  const withdrawAmount = Number(
    withdraw.amount || 0
  );

  const balance = Number(
    wallet.balance || 0
  );

  const lockedBalance = Number(
    wallet.locked_balance || 0
  );

  /* ============================= */
  /* 🚫 VALIDATION */
  /* ============================= */

  if (
    lockedBalance < withdrawAmount
  ) {
    throw new Error(
      "Insufficient locked balance"
    );
  }

  if (balance < withdrawAmount) {
    throw new Error(
      "Insufficient wallet balance"
    );
  }

  /* ============================= */
  /* 💸 UPDATE WALLET */
  /* ============================= */

  const { error: walletError } =
    await supabaseAdmin
      .from("wallets")
      .update({
        balance:
          balance - withdrawAmount,

        locked_balance:
          lockedBalance -
          withdrawAmount,
      })
      .eq(
        "seller_id",
        withdraw.seller_id
      );

  if (walletError) {
    console.error(walletError);

    throw new Error(
      "Failed to update wallet"
    );
  }

  /* ============================= */
  /* 🧾 TRANSACTION */
  /* ============================= */

  await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      seller_id:
        withdraw.seller_id,

      type: "debit",

      amount: withdrawAmount,

      reference_id: id,

      note:
        "Withdraw approved by admin",
    });

  /* ============================= */
  /* ✅ UPDATE REQUEST */
  /* ============================= */

  await supabaseAdmin
    .from("withdraw_requests")
    .update({
      status: "approved",
    })
    .eq("id", id);

  return {
    success: true,
  };
}

export async function rejectWithdraw(id: string) {
  await requireAdmin();

  const { data: withdraw } = await supabaseAdmin
    .from("withdraw_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!withdraw) throw new Error("Withdraw not found");
  if (withdraw.status !== "pending") throw new Error("Already processed");

  const { data: wallet } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("seller_id", withdraw.seller_id)
    .single();

  if (!wallet) throw new Error("Wallet not found");

  await supabaseAdmin
    .from("wallets")
    .update({
      locked_balance: wallet.locked_balance - withdraw.amount,
    })
    .eq("seller_id", withdraw.seller_id);

  await supabaseAdmin.from("wallet_transactions").insert({
    seller_id: withdraw.seller_id,
    type: "release",
    amount: withdraw.amount,
    reference_id: id,
    note: "Withdraw rejected",
  });

  await supabaseAdmin
    .from("withdraw_requests")
    .update({ status: "rejected" })
    .eq("id", id);
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
/* 🚚 SHIPPING */
/* ============================= */

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


export async function createShipmentByAdmin(
  orderId: string
) {
  await requireAdmin();

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
    /* 🚫 SELLER ACCEPT CHECK */
    /* ============================= */

   if (
  order.status !==
  "accepted"
) {
      throw new Error(
        "Seller must accept order before shipment"
      );
    }

    /* ============================= */
    /* 🚫 PREVENT DUPLICATE */
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
    /* 📦 FETCH ITEMS */
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
      .eq("order_id", orderId);

    if (
      itemsError ||
      !items?.length
    ) {
      throw new Error(
        "No order items found"
      );
    }

    /* ============================= */
    /* 🚫 VALIDATE ITEM STATUS */
    /* ============================= */

  const invalidItem =
  items.find(
    (item: any) =>
      item.status !==
      "accepted"
  );

    if (invalidItem) {
      throw new Error(
        "Some items are not accepted yet"
      );
    }

    /* ============================= */
    /* 🏭 GET SELLER */
    /* ============================= */

    const sellerId =
      items[0]?.seller_id;

    if (!sellerId) {
      throw new Error(
        "Seller not found"
      );
    }

    /* ============================= */
    /* 🏠 FETCH SELLER ADDRESS */
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
    /* 📦 PREPARE SHIPMENT ITEMS */
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
            item.product_name ||
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
    /* 🧠 DETERMINE STATUS */
    /* ============================= */

    const now =
      new Date().toISOString();
const orderStatus =
  shipment.awb_code
    ? "shipped"
    : "accepted";

    /* ============================= */
    /* ✅ UPDATE MAIN ORDER */
    /* ============================= */

    const {
      error: updateError,
    } = await supabaseAdmin
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
          "Pending",

        tracking_url:
          shipment.tracking_url ||
          null,

        status:
          orderStatus,

        shipped_at:
          shipment.awb_code
            ? now
            : null,

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

    const {
      error:
        orderItemsError,
    } = await supabaseAdmin
      .from("order_items")
      .update({
        status:
          orderStatus,

        shipped_at:
          shipment.awb_code
            ? now
            : null,
      })
      .eq("order_id", orderId);

    if (
      orderItemsError
    ) {
      throw new Error(
        orderItemsError.message
      );
    }

    /* ============================= */
    /* 🤖 AUTO DEV FLOW */
    /* ============================= */

    if (
      USE_FAKE_SHIPPING
    ) {
      /* ============================= */
      /* 🚚 AUTO OFD */
      /* ============================= */

  setTimeout(async () => {
  try {
    const ofdTime =
      new Date().toISOString();

    await supabaseAdmin
      .from("orders")
      .update({
        status:
          "out_for_delivery",

        out_for_delivery_at:
          ofdTime,
      })
      .eq("id", orderId);

    await supabaseAdmin
      .from("order_items")
      .update({
        status:
          "out_for_delivery",

        out_for_delivery_at:
          ofdTime,
      })
      .eq(
        "order_id",
        orderId
      );

    console.log(
      "AUTO OFD DONE"
    );
  } catch (e) {
    console.error(e);
  }
}, 10000);

      /* ============================= */
      /* ✅ AUTO DELIVER */
      /* ============================= */

      setTimeout(async () => {
        try {
          await deliverOrderInternal(
            orderId
          );

          console.log(
            "AUTO DELIVERY DONE"
          );
        } catch (e) {
          console.error(e);
        }
      }, 20000);
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

  if (orderError || !order) {
    console.error(
      "DELIVERY ORDER ERROR:",
      orderError
    );

    throw new Error(
      "Order not found"
    );
  }

  /* ============================= */
  /* 🚫 PREVENT DUPLICATE */
  /* ============================= */

  if (
    order.status ===
    "delivered"
  ) {
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
      "ITEMS ERROR:",
      itemsError
    );

    throw new Error(
      "Failed to fetch order items"
    );
  }

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
      "ORDER ITEMS UPDATE ERROR:",
      orderItemsError
    );

    throw new Error(
      "Failed to update order items"
    );
  }

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

      /* ============================= */
      /* ⏳ SELLER PAYOUT HOLD */
      /* ============================= */

      payout_release_at:
        payoutReleaseAt,

      seller_paid: false,
    })
    .eq("id", orderId);

  if (updateOrderError) {
    console.error(
      "ORDER UPDATE ERROR:",
      updateOrderError
    );

    throw new Error(
      "Failed to update order"
    );
  }

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
      "SHIPMENT UPDATE ERROR:",
      shipmentError
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
    "💰 Payout release scheduled for:",
    payoutReleaseAt
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

  return deliverOrderInternal(
    orderId
  );
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

export async function updateOrderStatusByAdmin(
  orderId: string,
  newStatus:
    | "shipped"
    | "out_for_delivery"
    | "delivered"
) {
  await requireAdmin();

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
    throw new Error(
      orderError.message
    );
  }

  /* ============================= */
  /* 💰 AUTO CREDIT SELLERS */
  /* ============================= */



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
/* 💸 SELLER PAYMENT */
/* ============================= */
export async function markSellerPaid(
    orderId: string
) {
  await requireAdmin();

  /* ============================= */
  /* 📦 GET ORDER */
  /* ============================= */

  const { data: order, error } =
    await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

  if (error || !order) {
    throw new Error("Order not found");
  }

  /* ============================= */
  /* 🔐 VALIDATIONS */
  /* ============================= */

  if (order.payment_status !== "paid") {
    throw new Error(
      "Order not paid"
    );
  }

  if (order.status !== "delivered") {
    throw new Error(
      "Order not delivered"
    );
  }

  if (order.seller_paid) {
    throw new Error(
      "Seller already paid"
    );
  }

  const amount = Number(
    order.seller_payout || 0
  );

  if (!amount || amount <= 0) {
    throw new Error(
      "Invalid seller payout"
    );
  }

  /* ============================= */
  /* 🔓 RELEASE WALLET BALANCE */
  /* ============================= */

  await releaseWalletBalance({
    sellerId: order.seller_id,

    orderId: order.id,

    amount,
  });

  /* ============================= */
  /* ✅ UPDATE ORDER */
  /* ============================= */

  const { error: updateError } =
    await supabaseAdmin
      .from("orders")
      .update({
        seller_paid: true,

        seller_paid_at:
          new Date().toISOString(),
      })
      .eq("id", orderId);

  if (updateError) {
    console.error(updateError);

    throw new Error(
      "Failed to update order"
    );
  }

  console.log(
    "✅ Seller payment released"
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
"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createShipment , assignCourier } from "@/services/shiprocket";
// 🔐 Check admin
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

// 🔁 Update Role
export async function updateUserRole(userId: string, role: string) {
  await requireAdmin(); // 🔐 protect

  const { error } = await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) {
    console.error(error);
    throw new Error("Failed to update role");
  }
}

// ❌ Delete User
export async function deleteUser(userId: string) {
  const admin = await requireAdmin(); // 🔐 protect

  // ❌ prevent self delete
  if (admin.id === userId) {
    throw new Error("You cannot delete yourself");
  }

  const { error } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", userId);

  if (error) {
    console.error(error);
    throw new Error("Failed to delete user");
  }
}
export async function updateUserStatus(userId: string, status: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("users")
    .update({ status })
    .eq("id", userId);

  if (error) throw new Error("Failed to update status");
}

export async function updateProductStatus(productId: string, status: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("products")
    .update({ status })
    .eq("id", productId);

  if (error) throw new Error("Failed to update product");
}


export async function approveWithdraw(id: string) {
  await requireAdmin();

  const { data: withdraw } = await supabaseAdmin
    .from("withdraw_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!withdraw) throw new Error("Withdraw not found");

  if (withdraw.status !== "pending") {
    throw new Error("Already processed");
  }

  const { data: wallet } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("seller_id", withdraw.seller_id)
    .single();

  if (!wallet) throw new Error("Wallet not found");

  if (wallet.locked_balance < withdraw.amount) {
    throw new Error("Invalid locked balance");
  }

  await supabaseAdmin
    .from("wallets")
    .update({
      balance: wallet.balance - withdraw.amount,
      locked_balance: wallet.locked_balance - withdraw.amount,
    })
    .eq("seller_id", withdraw.seller_id);

  await supabaseAdmin.from("wallet_transactions").insert({
    seller_id: withdraw.seller_id,
    type: "debit",
    amount: withdraw.amount,
    reference_id: id,
    note: "Withdraw approved",
  });

  await supabaseAdmin
    .from("withdraw_requests")
    .update({ status: "approved" })
    .eq("id", id);
}
  /* 💰 (OPTIONAL) RAZORPAY PAYOUT */
  // 👉 You can enable this later
  /*
  await fetch("https://api.razorpay.com/v1/payouts", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account_number: "YOUR_ACCOUNT_NUMBER",
      amount: request.amount * 100,
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      fund_account: {
        account_type: "bank_account",
        bank_account: {
          name: bank.account_holder_name,
          ifsc: bank.ifsc_code,
          account_number: bank.account_number,
        },
      },
    }),
  });
  */


export async function rejectWithdraw(id: string) {
  await requireAdmin();

  const { data: withdraw } = await supabaseAdmin
    .from("withdraw_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!withdraw) throw new Error("Withdraw not found");

  if (withdraw.status !== "pending") {
    throw new Error("Already processed");
  }

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
export async function markSellerPaid(orderId: string) {
  await requireAdmin();

  /* ============================= */
  /* 📦 GET ORDER */
  /* ============================= */
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("Order not found");

  if (order.seller_paid) {
    throw new Error("Already paid");
  }

  /* ============================= */
  /* 💰 GET SELLER */
  /* ============================= */
  const { data: item } = await supabaseAdmin
    .from("order_items")
    .select("seller_id")
    .eq("order_id", orderId)
    .limit(1)
    .single();

  if (!item) throw new Error("Seller not found");

  /* ============================= */
  /* 💳 GET WALLET */
  /* ============================= */
  const { data: wallet } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("seller_id", item.seller_id)
    .single();

  if (!wallet) throw new Error("Wallet not found");

  /* ============================= */
  /* 💸 ADD MONEY */
  /* ============================= */
  await supabaseAdmin
    .from("wallets")
    .update({
      balance: wallet.balance + order.seller_payout,
    })
    .eq("seller_id", item.seller_id);

  /* ============================= */
  /* 📜 TRANSACTION */
  /* ============================= */
  await supabaseAdmin.from("wallet_transactions").insert({
    seller_id: item.seller_id,
    type: "credit",
    amount: order.seller_payout,
    reference_id: orderId,
    note: "Order payout",
  });

  /* ============================= */
  /* ✅ MARK PAID */
  /* ============================= */
  await supabaseAdmin
    .from("orders")
    .update({ seller_paid: true })
    .eq("id", orderId);
}
export async function createShipmentByAdmin(orderId: string) {
  /* ============================= */
  /* 1. GET ORDER */
  /* ============================= */
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order || error) {
    throw new Error("Order not found");
  }

  /* ============================= */
  /* ❌ PREVENT DUPLICATE */
  /* ============================= */
  if (order.shipment_id) {
    throw new Error("Shipment already created");
  }

  try {
    /* ============================= */
    /* 2. CREATE SHIPMENT */
    /* ============================= */
    const shipment = await createShipment(order);

    if (!shipment?.shipment_id) {
      throw new Error("Shipment creation failed");
    }

    console.log("✅ SHIPMENT CREATED:", shipment);

    /* ============================= */
    /* 3. TRY COURIER ASSIGN */
    /* ============================= */
    let courier: any = null;

    try {
      courier = await assignCourier(shipment.shipment_id);
      console.log("🚚 COURIER RESPONSE:", courier);
    } catch (err: any) {
      console.log("⚠️ Courier assign failed (TEST MODE):", err.message);
    }

    /* ============================= */
    /* 🧠 TEST MODE DETECTION */
    /* ============================= */
    const isTestMode =
      !courier?.awb_code || !courier?.courier_name;

    /* ============================= */
    /* 4. SAVE DATA (IMPORTANT) */
    /* ============================= */
 await supabaseAdmin
  .from("orders")
  .update({
    shipment_id: shipment.shipment_id,

    /* ✅ FIX HERE */
    awb_code: courier?.awb_code || order.id.slice(0, 10),

    courier_name:
      courier?.courier_name || "Test Mode Courier",

    tracking_url: courier?.awb_code
      ? `https://shiprocket.co/tracking/${courier.awb_code}`
      : "#",

    status: "shipped",
    shipped_at: new Date(),
  })
  .eq("id", orderId);

    /* ============================= */
    /* 🔥 LOG FINAL STATE */
    /* ============================= */
    if (isTestMode) {
      console.log("⚠️ TEST MODE ACTIVE → No courier assigned");
    } else {
      console.log("✅ COURIER ASSIGNED SUCCESS");
    }

    return;
  } catch (error: any) {
    console.error("❌ ADMIN SHIPMENT ERROR:", error.message);

    // ❗ DO NOT BREAK SYSTEM
    throw new Error(
      error.message || "Shipment failed (safe mode)"
    );
  }
}

export async function verifyBankAccount(sellerId: string) {
  await requireAdmin();

  await supabaseAdmin
    .from("bank_accounts")
    .update({ is_verified: true })
    .eq("seller_id", sellerId);
}

export async function markWithdrawPaid(id: string) {
  await requireAdmin();

  const supabase = supabaseAdmin;

  const { data: request } = await supabase
    .from("withdraw_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) throw new Error("Request not found");

  if (request.status !== "approved") {
    throw new Error("Only approved payouts can be marked paid");
  }

  await supabase
    .from("withdraw_requests")
    .update({ status: "paid" })
    .eq("id", id);
}


export async function retryCourierAssign(orderId: string) {
  try {
    /* ============================= */
    /* 📦 GET ORDER */
    /* ============================= */
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      throw new Error("Order not found");
    }

    if (!order.shipment_id) {
      throw new Error("Shipment not created yet");
    }

    /* ============================= */
    /* 🚚 ASSIGN COURIER AGAIN */
    /* ============================= */
    const courier = await assignCourier(order.shipment_id);

    console.log("🔁 RETRY COURIER RESPONSE:", courier);

    if (!courier?.awb_code) {
      throw new Error("Still failed. Recharge wallet.");
    }

    /* ============================= */
    /* ✅ UPDATE ORDER */
    /* ============================= */
    await supabaseAdmin
      .from("orders")
      .update({
        awb_code: courier.awb_code,
        courier_name: courier.courier_name,
        tracking_url: `https://shiprocket.co/tracking/${courier.awb_code}`,
      })
      .eq("id", orderId);

    console.log("✅ COURIER ASSIGNED AFTER RETRY");

  } catch (error: any) {
    console.error("❌ RETRY ERROR:", error.message);

    throw new Error(error.message || "Retry failed");
  }
}

export async function markOrderDelivered(orderId: string) {
  await requireAdmin();

  /* ============================= */
  /* 📦 GET ORDER */
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

  if (!alreadyCredited?.length) {
    /* ============================= */
    /* 📦 GET ITEMS */
    /* ============================= */
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    for (const item of items || []) {
      const sellerId = item.seller_id;

      const earning =
        Number(item.cost_price || 0) *
        Number(item.quantity || 1);

      /* 🏦 WALLET */
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("seller_id", sellerId)
        .single();

      if (!wallet) continue;

      /* 💸 UPDATE */
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

  /* ✅ FINAL STATUS */
  await supabaseAdmin
    .from("orders")
    .update({
      status: "delivered",
      delivered_at: new Date(),
    })
    .eq("id", orderId);
}
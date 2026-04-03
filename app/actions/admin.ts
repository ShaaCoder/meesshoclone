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

  const supabase = supabaseAdmin;

  /* ============================= */
  /* 1. GET REQUEST */
  /* ============================= */
  const { data: request } = await supabase
    .from("withdraw_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) throw new Error("Request not found");

  /* ❌ PREVENT DOUBLE PROCESS */
  if (request.status !== "pending") {
    throw new Error("Already processed");
  }

  /* ============================= */
  /* 2. CHECK BANK */
  /* ============================= */
  const { data: bank } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("reseller_id", request.reseller_id)
    .single();

  if (!bank || !bank.is_verified) {
    throw new Error("Bank not verified");
  }

  /* ============================= */
  /* 3. DEDUCT WALLET */
  /* ============================= */
  await supabase.rpc("decrement_wallet", {
    user_id: request.reseller_id,
    amount: request.amount,
  });

  /* ============================= */
  /* 4. TRANSACTION LOG */
  /* ============================= */
  await supabase.from("transactions").insert({
    reseller_id: request.reseller_id,
    amount: request.amount,
    type: "debit",
    status: "completed",
  });

  /* ============================= */
  /* 5. UPDATE STATUS (IMPORTANT) */
  /* ============================= */
  await supabase
    .from("withdraw_requests")
    .update({ status: "approved" }) // 👈 NOT paid yet
    .eq("id", id);

  /* ============================= */
  /* 💰 RAZORPAY (KEEP AS IS) */
  /* ============================= */
  // 🔒 You said don't change → keeping untouched
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

  const supabase = supabaseAdmin;

  const { data: request } = await supabase
    .from("withdraw_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) throw new Error("Request not found");

  if (request.status !== "pending") {
    throw new Error("Already processed");
  }

  await supabase
    .from("withdraw_requests")
    .update({ status: "rejected" })
    .eq("id", id);
}
export async function markSellerPaid(orderId: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("orders")
    .update({
      seller_paid: true,
    })
    .eq("id", orderId);

  if (error) {
    console.error(error);
    throw new Error("Failed to mark payout");
  }
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
  if (order.awb_code) {
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
    /* 3. ASSIGN COURIER (IMPORTANT) */
    /* ============================= */
    const courier = await assignCourier(shipment.shipment_id);

    console.log("🚚 COURIER ASSIGNED:", courier);

    if (!courier?.awb_code) {
      throw new Error("Courier assignment failed");
    }

    /* ============================= */
    /* 4. SAVE ALL DATA */
    /* ============================= */
    await supabaseAdmin
      .from("orders")
      .update({
        shipment_id: shipment.shipment_id,
        awb_code: courier.awb_code,
        courier_name: courier.courier_name,
        tracking_url: `https://shiprocket.co/tracking/${courier.awb_code}`,
        status: "shipped",
        shipped_at: new Date(),
      })
      .eq("id", orderId);

    console.log("📦 ORDER UPDATED SUCCESS");

    return; // ✅ required (void)
  } catch (error: any) {
    console.error("❌ ADMIN SHIPMENT ERROR:", error.message);

    throw new Error(error.message || "Shipment failed");
  }
}

export async function verifyBankAccount(resellerId: string) {
  await supabaseAdmin
    .from("bank_accounts")
    .update({ is_verified: true })
    .eq("reseller_id", resellerId);
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
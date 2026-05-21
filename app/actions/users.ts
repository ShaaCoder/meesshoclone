"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/* ============================= */
/* 🧠 VALIDATORS */
/* ============================= */
function validatePhone(phone: string) {
  return /^[6-9]\d{9}$/.test(phone);
}

/* ============================= */
/* 👤 UPDATE PROFILE */
/* ============================= */
export async function updateProfile(formData: FormData) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const name = String(formData.get("name") || "").trim();
const phone = String(
  formData.get("phone") || ""
)
  .replace(/\s+/g, "")
  .replace("+91", "")
  .trim();

  if (!name || name.length < 2) {
    throw new Error("Invalid name");
  }

 if (
  phone &&
  !/^[6-9]\d{9}$/.test(phone)
) {
  throw new Error("Invalid phone number");
}

  await supabase
    .from("users")
    .update({ name, phone })
    .eq("id", user.id);

  revalidatePath("/dashboard/user/profile");
}

/* ============================= */
/* 📍 SAVE ADDRESS */
/* ============================= */
export async function saveAddress(formData: FormData) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string | null;

  const payload = {
    user_id: user.id,
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    address_line: String(formData.get("address") || ""),
    city: String(formData.get("city") || ""),
    state: String(formData.get("state") || ""),
    pincode: String(formData.get("pincode") || ""),
  };

  /* 🔍 VALIDATION */
  if (
    !payload.name ||
    !validatePhone(payload.phone) ||
    !payload.address_line ||
    !payload.city ||
    !payload.state ||
    payload.pincode.length < 6
  ) {
    throw new Error("Invalid address details");
  }

  if (id) {
    /* ✏️ UPDATE */
    await supabase
      .from("addresses")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);
  } else {
    /* ➕ INSERT */
    const { data: existing } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", user.id);

    const isFirst = !existing || existing.length === 0;

    await supabase.from("addresses").insert({
      ...payload,
      is_default: isFirst,
    });
  }

  revalidatePath("/dashboard/user/addresses");
}

/* ============================= */
/* ❌ DELETE ADDRESS */
/* ============================= */
export async function deleteAddress(formData: FormData) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const id = String(formData.get("id"));

  /* 🔐 OWNERSHIP CHECK */
  const { data: address } = await supabase
    .from("addresses")
    .select("user_id, is_default")
    .eq("id", id)
    .single();

  if (!address || address.user_id !== user.id) {
    throw new Error("Not allowed");
  }

  await supabase.from("addresses").delete().eq("id", id);

  /* 🔄 ENSURE DEFAULT EXISTS */
  if (address.is_default) {
    const { data: remaining } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (remaining?.length) {
      await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", remaining[0].id);
    }
  }

  revalidatePath("/dashboard/user/addresses");
}

/* ============================= */
/* ⭐ SET DEFAULT */
/* ============================= */
export async function setDefaultAddress(formData: FormData) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const id = String(formData.get("id"));

  /* 🔐 CHECK OWNERSHIP */
  const { data: address } = await supabase
    .from("addresses")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!address || address.user_id !== user.id) {
    throw new Error("Not allowed");
  }

  /* 🔄 RESET ALL */
  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", user.id);

  /* ⭐ SET NEW */
  await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id);

  revalidatePath("/dashboard/user/addresses");
}

/* ============================= */
/* 🚨 USER RISK (COD SYSTEM) */
/* ============================= */
export async function getUserRisk() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("users")
    .select("cod_orders_count, rto_count, is_cod_blocked")
    .eq("id", user.id)
    .single();

  return data;
}

/* ============================= */
/* 💸 ADD REFUND ACCOUNT */
/* ============================= */
export async function addRefundAccount(
  formData: FormData
) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  /* ============================= */
  /* FORM VALUES */
  /* ============================= */

  const account_holder_name = String(
    formData.get("account_holder_name") || ""
  ).trim();

  const bank_name = String(
    formData.get("bank_name") || ""
  ).trim();

  const account_number = String(
    formData.get("account_number") || ""
  ).trim();

  const ifsc_code = String(
    formData.get("ifsc_code") || ""
  ).trim();

  const upi_id = String(
    formData.get("upi_id") || ""
  ).trim();

  const phone = String(
    formData.get("phone") || ""
  ).trim();

  /* ============================= */
  /* VALIDATION */
  /* ============================= */

  const hasBank =
    bank_name &&
    account_number &&
    ifsc_code;

  const hasUpi = !!upi_id;

  if (!hasBank && !hasUpi) {
    throw new Error(
      "Add bank details or UPI ID"
    );
  }

  if (phone && !validatePhone(phone)) {
    throw new Error("Invalid phone number");
  }

  /* ============================= */
  /* CHECK EXISTING */
  /* ============================= */

  const { data: existing } = await supabase
    .from("customer_refund_accounts")
    .select("id")
    .eq("customer_id", user.id);

  const isFirst =
    !existing || existing.length === 0;

  /* ============================= */
  /* INSERT */
  /* ============================= */

  const { error } = await supabase
    .from("customer_refund_accounts")
    .insert({
      customer_id: user.id,

      account_holder_name,

      bank_name: bank_name || null,

      account_number:
        account_number || null,

      ifsc_code: ifsc_code || null,

      upi_id: upi_id || null,

      phone: phone || null,

      is_default: isFirst,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    "/dashboard/user/refund-accounts"
  );
}
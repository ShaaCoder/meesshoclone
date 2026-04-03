"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;

  await supabase
    .from("users")
    .update({ name, phone })
    .eq("id", user.id);

  revalidatePath("/dashboard/user/profile");
}

export async function saveAddress(formData: FormData) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const id = formData.get("id") as string | null;

  const payload = {
    user_id: user.id,
    name: formData.get("name"),
    phone: formData.get("phone"),
    address_line: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
  };

  if (id) {
    // ✏️ UPDATE
    await supabase
      .from("addresses")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);
  } else {
    // ➕ INSERT
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

// ❌ Delete Address
export async function deleteAddress(formData: FormData) {
  const supabase = await getSupabaseServer();

  const id = formData.get("id") as string;

  await supabase.from("addresses").delete().eq("id", id);

  revalidatePath("/dashboard/user/addresses");
}

// ⭐ Set Default Address
export async function setDefaultAddress(formData: FormData) {
  const supabase = await getSupabaseServer();

  const id = formData.get("id") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // remove old default
  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", user.id);

  // set new default
  await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id);

  revalidatePath("/dashboard/user/addresses");
}
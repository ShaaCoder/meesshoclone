"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/* ============================= */
/* ❤️ TOGGLE WISHLIST */
/* ============================= */
export async function toggleWishlist(productId: string) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  /* 🔍 PRODUCT VALIDATION */
  const { data: product } = await supabase
    .from("products")
    .select("id, status, approval_status")
    .eq("id", productId)
    .single();

  if (
    !product ||
    product.status !== "active" ||
    product.approval_status !== "approved"
  ) {
    throw new Error("Product not available");
  }

  /* 🔍 CHECK EXISTING */
  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlists").delete().eq("id", existing.id);

    revalidatePath("/wishlist");
    return { success: true, action: "removed" };
  }

  await supabase.from("wishlists").insert({
    user_id: user.id,
    product_id: productId,
  });

  revalidatePath("/wishlist");
  return { success: true, action: "added" };
}

/* ============================= */
/* ❌ REMOVE */
/* ============================= */
export async function removeFromWishlist(productId: string) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  revalidatePath("/wishlist");
  return { success: true };
}

/* ============================= */
/* 🛒 MOVE TO CART */
/* ============================= */
export async function moveToCart(productId: string) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  /* ============================= */
  /* 🔍 GET BEST VARIANT */
  /* ============================= */
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, stock, reserved_stock, selling_price, cost_price, platform_margin")
    .eq("product_id", productId)
    .order("selling_price", { ascending: true });

  if (!variants || variants.length === 0) {
    throw new Error("No variants available");
  }

  const variant = variants.find(
    (v) => (v.stock || 0) - (v.reserved_stock || 0) > 0
  );

  if (!variant) {
    throw new Error("Out of stock");
  }

  /* ============================= */
  /* 🔍 CHECK EXISTING CART */
  /* ============================= */
  const { data: existing } = await supabase
    .from("cart")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("variant_id", variant.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("cart")
      .update({
        quantity: existing.quantity + 1,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("cart").insert({
      user_id: user.id,
      product_id: productId,
      variant_id: variant.id,
      quantity: 1,
    });
  }

  /* ============================= */
  /* ❌ REMOVE FROM WISHLIST */
  /* ============================= */
  await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  revalidatePath("/wishlist");
  revalidatePath("/cart");

  return { success: true };
}
"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/* ============================= */
/* 🛒 ADD TO CART */
/* ============================= */
export async function addToCart(
  productId: string,
  variantId: string
) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Login required");

  if (!variantId) {
    throw new Error("Select variant");
  }

  /* ============================= */
  /* 🔍 PRODUCT CHECK */
  /* ============================= */
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

  /* ============================= */
  /* 🔍 VARIANT CHECK */
  /* ============================= */
  const { data: variant } = await supabase
    .from("product_variants")
    .select("id, stock, reserved_stock, selling_price, cost_price, platform_margin")
    .eq("id", variantId)
    .single();

  if (!variant) throw new Error("Invalid variant");

  const availableStock =
    (variant.stock || 0) - (variant.reserved_stock || 0);

  if (availableStock <= 0) {
    throw new Error("Out of stock");
  }

  /* ============================= */
  /* 🔍 EXISTING ITEM */
  /* ============================= */
  const { data: existing } = await supabase
    .from("cart")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("variant_id", variantId)
    .maybeSingle();

  if (existing) {
    const newQty = existing.quantity + 1;

    if (newQty > availableStock) {
      throw new Error("Stock limit reached");
    }

    await supabase
      .from("cart")
      .update({ quantity: newQty })
      .eq("id", existing.id);
  } else {
    await supabase.from("cart").insert({
      user_id: user.id,
      product_id: productId,
      variant_id: variantId,
      quantity: 1,
    });
  }

  revalidatePath("/cart");
}

/* ============================= */
/* 🔄 UPDATE QUANTITY */
/* ============================= */
export async function updateCartQuantity(
  cartItemId: string,
  newQuantity: number
) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  if (newQuantity < 1) {
    throw new Error("Min 1 quantity");
  }

  /* 🔍 CART ITEM */
  const { data: cartItem } = await supabase
    .from("cart")
    .select("variant_id, user_id")
    .eq("id", cartItemId)
    .single();

  if (!cartItem) throw new Error("Item not found");

  if (cartItem.user_id !== user.id) {
    throw new Error("Not allowed");
  }

  /* 🔍 VARIANT */
  const { data: variant } = await supabase
    .from("product_variants")
    .select("stock, reserved_stock")
    .eq("id", cartItem.variant_id)
    .single();

  if (!variant) throw new Error("Variant not found");

  const available =
    (variant.stock || 0) - (variant.reserved_stock || 0);

  if (newQuantity > available) {
    throw new Error("Stock exceeded");
  }

  await supabase
    .from("cart")
    .update({ quantity: newQuantity })
    .eq("id", cartItemId);

  revalidatePath("/cart");
  return { success: true };
}

/* ============================= */
/* ❌ REMOVE */
/* ============================= */
export async function removeFromCart(cartItemId: string) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: item } = await supabase
    .from("cart")
    .select("user_id")
    .eq("id", cartItemId)
    .single();

  if (!item || item.user_id !== user.id) {
    throw new Error("Not allowed");
  }

  await supabase.from("cart").delete().eq("id", cartItemId);

  revalidatePath("/cart");
  return { success: true };
}

/* ============================= */
/* 🧹 CLEAR CART */
/* ============================= */
export async function clearCart() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Login required");

  await supabase.from("cart").delete().eq("user_id", user.id);

  revalidatePath("/cart");
  return { success: true };
}
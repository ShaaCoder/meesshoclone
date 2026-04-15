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
    throw new Error("Please select size / variant");
  }

  /* ============================= */
  /* 🔍 VALIDATE PRODUCT */
  /* ============================= */
  const { data: product } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .single();

  if (!product || product.status !== "approved") {
    throw new Error("Product not available");
  }

  /* ============================= */
  /* 🔍 VALIDATE VARIANT */
  /* ============================= */
  const { data: variant } = await supabase
    .from("product_variants")
    .select("id, stock")
    .eq("id", variantId)
    .single();

  if (!variant) {
    throw new Error("Invalid variant");
  }

  if (variant.stock <= 0) {
    throw new Error("Out of stock");
  }

  /* ============================= */
  /* 🔍 CHECK EXISTING */
  /* ============================= */
  const { data: existingItem } = await supabase
    .from("cart")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .eq("variant_id", variantId)
    .maybeSingle();

  /* ============================= */
  /* ➕ UPDATE OR INSERT */
  /* ============================= */
  if (existingItem) {
    const newQty = existingItem.quantity + 1;

    if (newQty > variant.stock) {
      throw new Error("Stock limit reached");
    }

    await supabase
      .from("cart")
      .update({ quantity: newQty })
      .eq("id", existingItem.id);
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

  if (newQuantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  /* 🔍 GET CART ITEM */
  const { data: cartItem } = await supabase
    .from("cart")
    .select("variant_id")
    .eq("id", cartItemId)
    .single();

  if (!cartItem) throw new Error("Cart item not found");

  /* 🔍 CHECK STOCK */
  const { data: variant } = await supabase
    .from("product_variants")
    .select("stock")
    .eq("id", cartItem.variant_id)
    .single();

  if (!variant) throw new Error("Variant not found");

  if (newQuantity > variant.stock) {
    throw new Error("Stock limit exceeded");
  }

  const { error } = await supabase
    .from("cart")
    .update({ quantity: newQuantity })
    .eq("id", cartItemId);

  if (error) {
    console.error(error);
    throw new Error("Failed to update quantity");
  }

  revalidatePath("/cart");
  return { success: true };
}

/* ============================= */
/* ❌ REMOVE ITEM */
/* ============================= */
export async function removeFromCart(cartItemId: string) {
  const supabase = await getSupabaseServer();

  const { error } = await supabase
    .from("cart")
    .delete()
    .eq("id", cartItemId);

  if (error) throw new Error("Failed to remove item");

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

  const { error } = await supabase
    .from("cart")
    .delete()
    .eq("user_id", user.id);

  if (error) throw new Error("Failed to clear cart");

  revalidatePath("/cart");
  return { success: true };
}
// app/actions/cart.ts
"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function addToCart(
  productId: string,
  variantId?: string
) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Login required");

  /* 🔍 CHECK EXISTING */
  const { data: existingItem } = await supabase
    .from("cart")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .eq("variant_id", variantId || null)
    .maybeSingle();

  if (existingItem) {
    await supabase
      .from("cart")
      .update({ quantity: existingItem.quantity + 1 })
      .eq("id", existingItem.id);
  } else {
    await supabase.from("cart").insert({
      user_id: user.id,
      product_id: productId,
      variant_id: variantId || null,
      quantity: 1,
    });
  }

  revalidatePath("/cart");
}

// app/actions/cart.ts
export async function updateCartQuantity(cartItemId: string, newQuantity: number) {
  const supabase = await getSupabaseServer();

  if (newQuantity < 1) throw new Error("Quantity must be at least 1");

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

// Optional: Clear entire cart
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
"use server";

import { getSupabaseServer } from "@/lib/supabase-server";

export async function toggleWishlist(productId: string) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlists").delete().eq("id", existing.id);
    return { success: true, action: "removed" };
  }

  await supabase.from("wishlists").insert({
    user_id: user.id,
    product_id: productId,
  });

  return { success: true, action: "added" };
}

export async function removeFromWishlist(productId: string) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  return { success: true };
}



export async function moveToCart(productId: string) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // get first variant
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .limit(1);

  const variantId = variants?.[0]?.id;

  // add to cart
  await supabase.from("cart").insert({
    user_id: user.id,
    product_id: productId,
    variant_id: variantId,
    quantity: 1,
  });

  // remove from wishlist
  await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  return { success: true };
}
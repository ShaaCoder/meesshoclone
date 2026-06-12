"use server";

import { getSupabaseServer } from "@/lib/supabase-server";

import { revalidatePath } from "next/cache";

/* =========================================================
   🛒 ADD TO CART
========================================================= */

export async function addToCart(
  productId: string,
  variantId: string
) {

  const supabase =
    await getSupabaseServer();

  /* =========================================================
     🔐 AUTH
  ========================================================= */

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {

    throw new Error(
      "Login required"
    );
  }

  if (!variantId) {

    throw new Error(
      "Please select a variant"
    );
  }

  /* =========================================================
     📦 PRODUCT CHECK
  ========================================================= */

  const {
    data: product,
    error: productError,
  } =
    await supabase
      .from("products")
      .select(`
        id,
        status,
        approval_status,
        name
      `)
      .eq(
        "id",
        productId
      )
      .single();

  if (
    productError ||
    !product
  ) {

    throw new Error(
      "Product not found"
    );
  }

  if (
    product.status !==
      "active" ||
    product.approval_status !==
      "approved"
  ) {

    throw new Error(
      "Product unavailable"
    );
  }

  /* =========================================================
     📦 VARIANT CHECK
  ========================================================= */

  const {
    data: variant,
    error: variantError,
  } =
    await supabase
      .from("product_variants")
      .select(`
        id,
        stock,
        reserved_stock,

        selling_price,
        mrp,

        size,
        color,

        attributes
      `)
      .eq(
        "id",
        variantId
      )
      .single();

  if (
    variantError ||
    !variant
  ) {

    console.error(
      "VARIANT ERROR:",
      variantError
    );

    throw new Error(
      "Variant not found"
    );
  }

  /* =========================================================
     🧠 STOCK
  ========================================================= */

  const stock =
    Number(
      variant.stock || 0
    );

  const reserved =
    Number(
      variant.reserved_stock ||
        0
    );

  const availableStock =
    stock - reserved;

  if (
    availableStock <= 0
  ) {

    throw new Error(
      "Out of stock"
    );
  }

  /* =========================================================
     🎨 VARIANT DATA
  ========================================================= */

  const size =
    variant.size ||
    variant.attributes
      ?.size ||
    null;

  const color =
    variant.color ||
    variant.attributes
      ?.color ||
    null;

  /* =========================================================
     🔍 EXISTING CART ITEM
  ========================================================= */

  const {
    data: existingCart,
  } =
    await supabase
      .from("cart")
      .select(`
        id,
        quantity
      `)
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "variant_id",
        variantId
      )
      .maybeSingle();

  /* =========================================================
     🔄 UPDATE EXISTING
  ========================================================= */

  if (
    existingCart
  ) {

    const nextQty =
      Number(
        existingCart.quantity ||
          0
      ) + 1;

    if (
      nextQty >
      availableStock
    ) {

      throw new Error(
        "Stock limit exceeded"
      );
    }

    const {
      error: updateError,
    } =
      await supabase
        .from("cart")
        .update({
          quantity:
            nextQty,

          size,
          color,

          price:
            Number(
              variant.selling_price ||
                0
            ),

          mrp:
            Number(
              variant.mrp ||
                0
            ),
        })
        .eq(
          "id",
          existingCart.id
        );

    if (
      updateError
    ) {

      console.error(
        "UPDATE CART ERROR:",
        updateError
      );

      throw new Error(
        updateError.message
      );
    }
  }

  /* =========================================================
     ➕ CREATE NEW
  ========================================================= */

  else {

    const {
      error: insertError,
    } =
      await supabase
        .from("cart")
        .insert({
          user_id:
            user.id,

          product_id:
            productId,

          variant_id:
            variantId,

          quantity: 1,

          price:
            Number(
              variant.selling_price ||
                0
            ),

          mrp:
            Number(
              variant.mrp ||
                0
            ),

          size,
          color,
        });

    if (
      insertError
    ) {

      console.error(
        "INSERT CART ERROR:",
        insertError
      );

      throw new Error(
        insertError.message
      );
    }
  }

  /* =========================================================
     ♻️ REVALIDATE
  ========================================================= */

  revalidatePath(
    "/cart"
  );

  revalidatePath(
    "/"
  );

  return {
    success: true,
  };
}

/* =========================================================
   🔄 UPDATE CART QUANTITY
========================================================= */

export async function updateCartQuantity(
  cartItemId: string,
  newQuantity: number
) {

  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {

    throw new Error(
      "Unauthorized"
    );
  }

  if (
    newQuantity < 1
  ) {

    throw new Error(
      "Minimum quantity is 1"
    );
  }

  const {
    data: cartItem,
    error: cartError,
  } =
    await supabase
      .from("cart")
      .select(`
        id,
        user_id,
        variant_id
      `)
      .eq(
        "id",
        cartItemId
      )
      .single();

  if (
    cartError ||
    !cartItem
  ) {

    throw new Error(
      "Cart item not found"
    );
  }

  if (
    cartItem.user_id !==
    user.id
  ) {

    throw new Error(
      "Access denied"
    );
  }

  const {
    data: variant,
    error: variantError,
  } =
    await supabase
      .from("product_variants")
      .select(`
        stock,
        reserved_stock
      `)
      .eq(
        "id",
        cartItem.variant_id
      )
      .single();

  if (
    variantError ||
    !variant
  ) {

    throw new Error(
      "Variant not found"
    );
  }

  const available =
    Number(
      variant.stock || 0
    ) -
    Number(
      variant.reserved_stock ||
        0
    );

  if (
    newQuantity >
    available
  ) {

    throw new Error(
      "Stock exceeded"
    );
  }

  const {
    error: updateError,
  } =
    await supabase
      .from("cart")
      .update({
        quantity:
          newQuantity,
      })
      .eq(
        "id",
        cartItemId
      );

  if (
    updateError
  ) {

    throw new Error(
      updateError.message
    );
  }

  revalidatePath(
    "/cart"
  );

  return {
    success: true,
  };
}

/* =========================================================
   ❌ REMOVE FROM CART
========================================================= */

export async function removeFromCart(
  cartItemId: string
) {

  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {

    throw new Error(
      "Unauthorized"
    );
  }

  const {
    data: cartItem,
    error,
  } =
    await supabase
      .from("cart")
      .select(`
        id,
        user_id
      `)
      .eq(
        "id",
        cartItemId
      )
      .single();

  if (
    error ||
    !cartItem
  ) {

    throw new Error(
      "Cart item not found"
    );
  }

  if (
    cartItem.user_id !==
    user.id
  ) {

    throw new Error(
      "Access denied"
    );
  }

  const {
    error: deleteError,
  } =
    await supabase
      .from("cart")
      .delete()
      .eq(
        "id",
        cartItemId
      );

  if (
    deleteError
  ) {

    throw new Error(
      deleteError.message
    );
  }

  revalidatePath(
    "/cart"
  );

  return {
    success: true,
  };
}

/* =========================================================
   🧹 CLEAR CART
========================================================= */

export async function clearCart() {

  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {

    throw new Error(
      "Login required"
    );
  }

  const {
    error,
  } =
    await supabase
      .from("cart")
      .delete()
      .eq(
        "user_id",
        user.id
      );

  if (
    error
  ) {

    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/cart"
  );

  return {
    success: true,
  };
}
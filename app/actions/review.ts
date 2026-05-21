"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/* ============================= */
/* 🧠 VALIDATION */
/* ============================= */
function validateRating(rating: number) {
  return rating >= 1 && rating <= 5;
}

/* ============================= */
/* ⭐ ADD REVIEW */
/* ============================= */
export async function addReview(formData: FormData) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Login required");

  const product_id = String(formData.get("product_id"));
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") || "").trim();

  /* ============================= */
  /* 🖼 SAFE IMAGE PARSE */
  /* ============================= */
  let images: string[] = [];

  try {
    images = JSON.parse(String(formData.get("images") || "[]"));
  } catch {
    images = [];
  }

  /* ============================= */
  /* 🔍 VALIDATION */
  /* ============================= */
  if (!product_id) throw new Error("Invalid product");

  if (!validateRating(rating)) {
    throw new Error("Rating must be 1-5");
  }

  if (comment.length < 3) {
    throw new Error("Write a proper review");
  }

  /* ============================= */
  /* 🛍 CHECK PURCHASE (ANTI-FAKE) */
  /* ============================= */
  const { data: orderItem } = await supabase
    .from("order_items")
    .select(`
      id,
      order:orders(status)
    `)
    .eq("product_id", product_id)
    .eq("seller_id", user.id) // ❌ WRONG BEFORE → FIX BELOW
    .limit(1);

  /* 🔥 FIX: Check via order + customer */
  const { data: purchased } = await supabase
    .from("orders")
    .select(`
      id,
      order_items!inner(product_id)
    `)
    .eq("customer_id", user.id)
    .eq("status", "delivered")
    .eq("order_items.product_id", product_id)
    .limit(1);

  if (!purchased || purchased.length === 0) {
    throw new Error("You can review only purchased products");
  }

  /* ============================= */
  /* 🚫 PREVENT DUPLICATE REVIEW */
  /* ============================= */
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", product_id)
    .maybeSingle();

  if (existing) {
    throw new Error("You already reviewed this product");
  }

  /* ============================= */
  /* 🧠 LIMIT IMAGES */
  /* ============================= */
  images = images.slice(0, 5);

  /* ============================= */
  /* 💾 INSERT */
  /* ============================= */
  const { error } = await supabase.from("reviews").insert({
    product_id,
    user_id: user.id,
    rating,
    comment,
    images,
    is_verified: true, // since purchased
  });

  if (error) {
    console.error(error);
    throw new Error("Failed to add review");
  }

  revalidatePath(`/product/${product_id}`);
}
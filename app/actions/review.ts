"use server";

import { getSupabaseServer } from "@/lib/supabase-server";

export async function addReview(formData: FormData) {
  const supabase = await getSupabaseServer();

  const product_id = formData.get("product_id") as string;
  const rating = Number(formData.get("rating"));
  const comment = formData.get("comment") as string;
  const images = JSON.parse(formData.get("images") as string || "[]");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not logged in");

  const { error } = await supabase.from("reviews").insert({
    product_id,
    user_id: user.id,
    rating,
    comment,
    images,
  });

  if (error) throw error;
}
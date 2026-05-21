"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function logout() {
  const supabase = await getSupabaseServer();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error.message);
      throw new Error("Logout failed");
    }

    /* 🔄 CLEAR UI CACHE */
    revalidatePath("/");
    revalidatePath("/cart");
    revalidatePath("/wishlist");
    revalidatePath("/dashboard");

  } catch (err) {
    console.error("Logout failed:", err);
  }

  /* 🔁 ALWAYS REDIRECT */
  redirect("/login");
}
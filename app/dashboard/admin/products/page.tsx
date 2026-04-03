import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import ProductsClient from "./ProductsClient";

export default async function Page() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return redirect("/dashboard");

  /* ============================= */
  /* 🔥 FETCH PRODUCTS + SELLER */
  /* ============================= */
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select(`
      id,
      name,
      base_price,
      selling_price,
      status,
      seller_id,
      users:seller_id (
        name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ PRODUCTS ERROR:", error);
  }

  return <ProductsClient products={products} />;
}
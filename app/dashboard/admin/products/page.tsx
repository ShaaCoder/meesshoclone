import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import ProductsClient from "./ProductsClient";
import { calculatePrice } from "@/lib/pricing";

export default async function Page() {
  const supabase = await getSupabaseServer();

  /* ============================= */
  /* 🔐 AUTH */
  /* ============================= */
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
  /* 📦 PRODUCTS */
  /* ============================= */
  const { data: products } = await supabaseAdmin
    .from("products")
    .select(`
      id,
      name,
      approval_status,
      seller_id,
      users:seller_id(name, email)
    `)
    .order("created_at", { ascending: false });

  /* ============================= */
  /* 📦 VARIANTS */
  /* ============================= */
  const { data: variants } = await supabaseAdmin
    .from("product_variants")
    .select("*");

  /* ============================= */
  /* 🔥 MAP VARIANTS BY PRODUCT */
  /* ============================= */
  const variantMap: Record<string, any[]> = {};

  variants?.forEach((v: any) => {
    if (!variantMap[v.product_id]) {
      variantMap[v.product_id] = [];
    }
    variantMap[v.product_id].push(v);
  });

  /* ============================= */
  /* 🔥 MERGE + CALCULATE */
  /* ============================= */
  const finalProducts =
    products?.map((p: any) => {
      const pv = variantMap[p.id] || [];

      const prices = pv.map((v: any) => v.selling_price || 0);
      const profits = pv.map((v: any) => v.platform_margin || 0);

      return {
        ...p,
        variants: pv,
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        minProfit: profits.length ? Math.min(...profits) : 0,
        maxProfit: profits.length ? Math.max(...profits) : 0,
      };
    }) || [];

  return <ProductsClient products={finalProducts} />;
}
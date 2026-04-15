import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import ProductsClient from "./ProductsClient";
import { calculatePrice } from "@/lib/pricing";

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
  /* 📦 PRODUCTS */
  /* ============================= */
  const { data: products } = await supabaseAdmin
    .from("products")
    .select(`
      id,
      name,
      status,
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
  /* 🔥 MERGE + CALCULATE */
  /* ============================= */
  const finalProducts =
    products?.map((p: any) => {
      const pv = variants?.filter((v) => v.product_id === p.id) || [];

      /* 🔥 ENRICH VARIANTS */
      const enrichedVariants = pv.map((v) => ({
        ...v,
        ...calculatePrice(v),
      }));

      /* 🔥 PRICE RANGE */
      const prices = enrichedVariants
        .map((v) => v.selling)
        .filter((n: number) => n > 0);

      const minPrice = prices.length ? Math.min(...prices) : 0;
      const maxPrice = prices.length ? Math.max(...prices) : 0;

      /* 🔥 PROFIT RANGE */
      const profits = enrichedVariants.map((v) => v.profit || 0);

      const minProfit = profits.length ? Math.min(...profits) : 0;
      const maxProfit = profits.length ? Math.max(...profits) : 0;

      return {
        ...p,
        variants: enrichedVariants,
        minPrice,
        maxPrice,
        minProfit,
        maxProfit,
      };
    }) || [];

  return <ProductsClient products={finalProducts} />;
}
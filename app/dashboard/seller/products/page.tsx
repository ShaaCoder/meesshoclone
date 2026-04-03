import ProductsClient from "@/components/dashboard/seller/ProductsClient";
import { getSupabaseServer } from "@/lib/supabase-server";

export default async function Page() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: products } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("seller_id", user?.id)
    .order("created_at", { ascending: false });

  const { data: categories } = await supabase
    .from("categories")
    .select("*");

  return (
    <ProductsClient
      products={products}
      categories={categories}
    />
  );
}
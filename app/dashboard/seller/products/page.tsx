import ProductsClient from "@/components/dashboard/seller/ProductsClient";
import { getSupabaseServer } from "@/lib/supabase-server";

export default async function Page() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  const { data: products, error: pError } = await supabase
    .from("products")
    .select(`
      *,
      categories(name),
      product_images(*)
    `)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const { data: categories, error: cError } = await supabase
    .from("categories")
    .select("*");

  console.log("CATEGORIES:", categories);
  console.log("ERROR:", cError);

  return (
    <ProductsClient
      products={products || []}
      categories={categories || []}
    />
  );
}
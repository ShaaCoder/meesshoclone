import ProductsClient from "@/components/dashboard/seller/ProductsClient";
import { getSupabaseServer } from "@/lib/supabase-server";

export default async function Page() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  /* ============================= */
  /* 📦 PRODUCTS */
  /* ============================= */
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      status,
      created_at,
      image,
      category_id,
      categories(name),
      catalogs(title),
      product_variants!product_variants_product_id_fkey(*),
      product_images!product_images_product_id_fkey(*)
    `)
    .eq("seller_id", user.id)
    .neq("status", "deleted") // 🔥 IMPORTANT
    .order("created_at", { ascending: false });

  if (error) {
    console.error("PRODUCT FETCH ERROR:", error);
  }

  /* ============================= */
  /* 📂 CATEGORIES */
  /* ============================= */
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name");

  return (
    <ProductsClient
      products={products || []}
      categories={categories || []}
    />
  );
}
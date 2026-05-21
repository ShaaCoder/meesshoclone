import ProductsClient from "@/components/dashboard/seller/ProductsClient";
import { getSupabaseServer } from "@/lib/supabase-server";

export default async function Page() {
  const supabase = await getSupabaseServer();

  /* ============================= */
  /* 🔐 AUTH */
  /* ============================= */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("AUTH ERROR:", userError);
    return <div>Unauthorized</div>;
  }

  /* ============================= */
  /* 📦 PRODUCTS */
  /* ============================= */
  const { data: products, error: productError } = await supabase
  .from("products")
  .select(`
    id,
    name,
    description,
    status,
    created_at,
    category_id,

    categories!fk_category (
      id,
      name
    ),

    product_variants (
      id,
      size,
      color,
      stock,
      cost_price,
      mrp
    ),

    product_images (
      url,
      is_primary
    )
  `)
  .eq("seller_id", user.id)
  .neq("status", "deleted")
  .order("created_at", { ascending: false });

  if (productError) {
    console.error("❌ PRODUCT FETCH ERROR:", productError);
  }

  /* ============================= */
  /* 📂 CATEGORIES */
  /* ============================= */
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (categoryError) {
    console.error("❌ CATEGORY FETCH ERROR:", categoryError);
  }

  /* ============================= */
  /* 🚀 FINAL RETURN */
  /* ============================= */
  return (
    <ProductsClient
      products={products || []}
      categories={categories || []}
    />
  );
}
import EditProductForm from "@/components/dashboard/seller/EditProductForm";

import { getSupabaseServer } from "@/lib/supabase-server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({
  params,
}: Props) {

  const { id } =
    await params;

  const supabase =
    await getSupabaseServer();

  /* =========================================================
     🔐 AUTH
  ========================================================= */

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {

    console.error(
      "AUTH ERROR:",
      userError
    );

    return (
      <div className="p-10">

        Unauthorized

      </div>
    );
  }

  /* =========================================================
     📦 PRODUCT
  ========================================================= */

  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      slug,
      seller_id,
      category_id,
      status,
      approval_status,
      created_at,

      categories (
        id,
        name,
        slug,
        variant_schema
      ),

      product_variants (
        id,
        size,
        color,
        attributes,
        stock,
        reserved_stock,
        cost_price,
        mrp,
        selling_price,
        platform_margin,
        seller_profit,
        created_at
      ),

      product_images (
        id,
        url,
        color,
        is_primary
      )
    `)
    .eq("id", id)
    .eq(
      "seller_id",
      user.id
    )
    .single();

  if (
    productError
  ) {

    console.error(
      "❌ PRODUCT ERROR:",
      productError
    );
  }

  /* =========================================================
     📂 CATEGORIES
  ========================================================= */

  const {
    data: categories,
    error: categoryError,
  } = await supabase
    .from("categories")
    .select(`
      id,
      name,
      slug,
      margin_percent,
      gst_percent,
      variant_schema
    `)
    .order("name", {
      ascending: true,
    });

  if (
    categoryError
  ) {

    console.error(
      "❌ CATEGORY ERROR:",
      categoryError
    );
  }

  /* =========================================================
     ❌ NOT FOUND
  ========================================================= */

  if (!product) {

    return (
      <div className="p-10">

        Product not found

      </div>
    );
  }

  /* =========================================================
     🚀 PAGE
  ========================================================= */

  return (
    <div className="space-y-6">

      {/* =========================================================
         HEADER
      ========================================================= */}

      <div>

        <h1 className="text-3xl font-bold">

          Edit Product

        </h1>

        <p className="text-sm text-zinc-500 mt-1">

          Update product details,
          variants, pricing,
          stock and images

        </p>

      </div>

      {/* =========================================================
         EDIT FORM
      ========================================================= */}

      <EditProductForm
        product={product}
        categories={
          categories || []
        }
      />

    </div>
  );
}
import ProductsClient from "@/components/dashboard/seller/ProductsClient";

import { getSupabaseServer } from "@/lib/supabase-server";

export default async function Page() {

  const supabase =
    await getSupabaseServer();

  /* ============================= */
  /* 🔐 AUTH */
  /* ============================= */

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
      <div className="p-10 text-center">
        Unauthorized
      </div>
    );
  }

  /* ============================= */
  /* 📦 PRODUCTS */
  /* ============================= */

  const {
    data: products,
    error: productError,
  } =
    await supabase
      .from("products")
      .select(`
        id,
        seller_id,

        name,
        description,
        slug,

        status,
        approval_status,

        created_at,

        category_id,

        categories!fk_category (
          id,
          name,
          slug,
          gst_percent,
          margin_percent,
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
          is_primary,
          created_at
        )
      `)
      .eq(
        "seller_id",
        user.id
      )
      .neq(
        "status",
        "deleted"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (
    productError
  ) {

    console.error(
      "❌ PRODUCT FETCH ERROR:",
      productError
    );
  }

  /* ============================= */
  /* 🧠 NORMALIZE PRODUCTS */
  /* ============================= */

  const normalizedProducts =
    (products || []).map(
      (product: any) => {

        const variants =
          product.product_variants ||
          [];

        const images =
          product.product_images ||
          [];

        /* ============================= */
        /* 📦 TOTAL STOCK */
        /* ============================= */

        const totalStock =
          variants.reduce(
            (
              total: number,
              variant: any
            ) => {

              const stock =
                Number(
                  variant.stock || 0
                );

              const reserved =
                Number(
                  variant.reserved_stock ||
                    0
                );

              return (
                total +
                (stock - reserved)
              );
            },
            0
          );

        /* ============================= */
        /* 💰 PRICE RANGE */
        /* ============================= */

        const prices =
          variants
            .map(
              (variant: any) =>
                Number(
                  variant.selling_price ||
                    0
                )
            )
            .filter(
              (price: number) =>
                price > 0
            );

        const minPrice =
          prices.length
            ? Math.min(
                ...prices
              )
            : 0;

        const maxPrice =
          prices.length
            ? Math.max(
                ...prices
              )
            : 0;

        /* ============================= */
        /* 🖼 PRIMARY IMAGE */
        /* ============================= */

        const primaryImage =
          images.find(
            (img: any) =>
              img.is_primary
          )?.url ||
          images?.[0]?.url ||
          "/placeholder.png";

        return {

          ...product,

          totalStock,

          minPrice,

          maxPrice,

          primaryImage,

          variantCount:
            variants.length,

          imageCount:
            images.length,
        };
      }
    );

  /* ============================= */
  /* 📂 CATEGORIES */
  /* ============================= */

  const {
    data: categories,
    error: categoryError,
  } =
    await supabase
      .from("categories")
      .select(`
        id,
        name,
        slug,

        margin_percent,
        gst_percent,

        variant_schema
      `)
      .order(
        "name",
        {
          ascending: true,
        }
      );

  if (
    categoryError
  ) {

    console.error(
      "❌ CATEGORY FETCH ERROR:",
      categoryError
    );
  }

  /* ============================= */
  /* 🚀 FINAL */
  /* ============================= */

  return (
    <ProductsClient
      products={
        normalizedProducts
      }
      categories={
        categories || []
      }
    />
  );
}
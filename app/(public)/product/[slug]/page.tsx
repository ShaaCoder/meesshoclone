

import { getSupabaseServer } from "@/lib/supabase-server";

import { notFound } from "next/navigation";

import ProductClient from "./ProductClient";

import SimilarProducts from "@/components/SimilarProducts";
import ReviewForm from "@/components/ReviewForm";
import ReviewsList from "@/components/ReviewsList";

import {
  calculatePrice,
} from "@/lib/pricing";

export const dynamic =
  "force-dynamic";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

/* =========================================================
   🔥 METADATA
========================================================= */

export async function generateMetadata({
  params,
}: Props) {

  const { slug } =
    await params;

  const supabase =
    await getSupabaseServer();

  const {
    data: product,
  } = await supabase
    .from("products")
    .select(`
      name,
      description,

      product_images (
        id,
        url,
        color,
        is_primary
      )
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (!product) {
    return {};
  }

  return {
    title: product.name,

    description:
      product.description,

    openGraph: {
      title: product.name,

      description:
        product.description,

      images:
        product.product_images?.map(
          (i: any) => i.url
        ) || [
          "/placeholder.svg",
        ],
    },
  };
}

/* =========================================================
   📦 PAGE
========================================================= */

export default async function ProductPage({
  params,
}: Props) {

  const { slug } =
    await params;

  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  /* =========================================================
     📦 PRODUCT
  ========================================================= */

  const {
    data: product,
  } = await supabase
    .from("products")
    .select(`
      *,

      product_images (
        id,
        url,
        is_primary,
        color
      ),

      product_variants (
        *
      ),

      categories (
        margin_percent
      )
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .eq(
      "approval_status",
      "approved"
    )
    .maybeSingle();

  if (!product) {
    return notFound();
  }

  /* =========================================================
     🖼️ DEFAULT IMAGE
  ========================================================= */

  const primaryImage =
    product.product_images?.find(
      (img: any) =>
        img.is_primary
    ) ||
    product.product_images?.[0] ||
    null;

  /* =========================================================
     🧠 NORMALIZE IMAGES
  ========================================================= */

  const normalizedImages =
    (product.product_images || []).map(
      (img: any) => ({
        ...img,

        color: img.color
          ? String(
              img.color
            ).toLowerCase()
          : null,
      })
    );

  product.product_images =
    normalizedImages;

  /* =========================================================
     💰 APPLY PRICING ENGINE
  ========================================================= */

  const margin = Number(
    product.categories
      ?.margin_percent || 25
  );

  const variants =
    (
      product.product_variants ||
      []
    ).map((variant: any) => {

      const pricing =
        calculatePrice({
          cost_price:
            Number(
              variant.cost_price ||
                0
            ),

          margin_percent:
            Number(
              variant.platform_margin ||
                margin
            ),
        });

      /* =========================================================
         🎨 NORMALIZE VARIANT COLOR
      ========================================================= */

      const variantColor =
        variant.color
          ? String(
              variant.color
            ).toLowerCase()
          : variant.attributes
              ?.color
          ? String(
              variant.attributes
                .color
            ).toLowerCase()
          : null;

      /* =========================================================
         🎨 FILTER COLOR IMAGES
      ========================================================= */

      const variantImages =
        normalizedImages.filter(
          (img: any) => {
            if (
              !img.color ||
              !variantColor
            ) {
              return false;
            }

            return (
              img.color ===
              variantColor
            );
          }
        );

      /* =========================================================
         🖼️ MAIN VARIANT IMAGE
      ========================================================= */

      let variantImage =
        variant.image ||
        variant.attributes
          ?.image ||
        null;

      if (!variantImage) {
        variantImage =
          variantImages?.[0]?.url ||
          primaryImage?.url ||
          null;
      }

      return {
        ...variant,

        color:
          variantColor,

        image:
          variantImage,

        images:
          variantImages.length
            ? variantImages
            : normalizedImages,

        selling_price:
          Number(
            variant.selling_price
          ) ||
          pricing.selling_price,

        seller_profit:
          Number(
            variant.seller_profit
          ) ||
          pricing.seller_profit,

        platform_margin:
          Number(
            variant.platform_margin
          ) || margin,
      };
    });

  product.product_variants =
    variants;

  /* =========================================================
     ❤️ WISHLIST
  ========================================================= */

  let isWishlisted =
    false;

  if (user) {

    const { data } =
      await supabase
        .from("wishlists")
        .select("id")
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "product_id",
          product.id
        )
        .maybeSingle();

    isWishlisted = !!data;
  }

  /* =========================================================
     🔥 SIMILAR PRODUCTS
  ========================================================= */

  const {
    data: similarProducts,
  } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,

      product_images (
        url,
        is_primary,
        color
      ),

      product_variants (
        selling_price,
        cost_price,
        stock,
        color,
        attributes
      )
    `)
    .eq(
      "category_id",
      product.category_id
    )
    .neq("id", product.id)
    .eq("status", "active")
    .eq(
      "approval_status",
      "approved"
    )
    .limit(10);

  /* =========================================================
     ⭐ REVIEWS
  ========================================================= */

  const {
    data: reviews,
  } = await supabase
    .from("reviews")
    .select(`
      *,
      users(name)
    `)
    .eq(
      "product_id",
      product.id
    )
    .order("created_at", {
      ascending: false,
    });

  const avgRating =
    reviews?.length
      ? reviews.reduce(
          (
            total: number,
            review: any
          ) =>
            total +
            Number(
              review.rating || 0
            ),
          0
        ) / reviews.length
      : 0;

  /* =========================================================
     🚀 UI
  ========================================================= */

  return (
    <>
      <ProductClient
        product={product}
        isWishlisted={
          isWishlisted
        }
      />

      {/* REVIEWS */}

      <div className="max-w-4xl mx-auto px-6 mt-16 space-y-10">

        <h2 className="text-2xl font-bold">
          ⭐ {" "}
          {avgRating.toFixed(1)}
          {" "}
          (
          {reviews?.length ||
            0}
          )
        </h2>

        <ReviewForm
          productId={
            product.id
          }
        />

        <ReviewsList
          reviews={
            reviews || []
          }
        />

        {/* SIMILAR PRODUCTS */}

        {similarProducts &&
          similarProducts.length >
            0 && (
            <div className="pt-10">
              <SimilarProducts
                products={
                  similarProducts
                }
              />
            </div>
          )}
      </div>
    </>
  );
}


// ## Important

// You ALSO need to update your `ProductClient.tsx` because image switching happens there on the client side.

// This server page now correctly:

// * maps images by color
// * sends variant-specific images
// * normalizes colors
// * prevents green image showing for red variant
// * supports scalable variant galleries

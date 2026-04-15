import { getSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import ProductClient from "./ProductClient";
import SimilarProducts from "@/components/SimilarProducts";
import ReviewForm from "@/components/ReviewForm";
import ReviewsList from "@/components/ReviewsList";

/* ============================= */
/* 🔥 SEO METADATA */
/* ============================= */

export async function generateMetadata({ params }: any) {
  const { slug } = await params;

  const supabase = await getSupabaseServer();

  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      product_images(*),
      product_variants!product_variants_product_id_fkey(*)
    `)
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (!product) return {};

  const images =
    product.product_images?.length > 0
      ? product.product_images.map((img: any) => img.url)
      : [product.image];

  return {
    title: product.meta_title || product.name,
    description: product.meta_description || product.description,

    openGraph: {
      title: product.name,
      description: product.meta_description,
      images,
    },

    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.meta_description,
      images,
    },
  };
}

/* ============================= */
/* 📦 PRODUCT PAGE */
/* ============================= */

export default async function ProductPage({ params }: any) {
  const { slug } = await params;

  const supabase = await getSupabaseServer();

  /* ============================= */
  /* 👤 GET USER (🔥 NEW) */
  /* ============================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* ============================= */
  /* 📦 FETCH PRODUCT */
  /* ============================= */

  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      product_images(*),
      product_attributes(value, attributes(name)),
      product_variants!product_variants_product_id_fkey(*)
    `)
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (error || !product) return notFound();

  /* ============================= */
  /* ❤️ WISHLIST CHECK (🔥 NEW) */
  /* ============================= */

  let isWishlisted = false;

  if (user) {
    const { data: wishlistItem } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();

    isWishlisted = !!wishlistItem;
  }

  /* ============================= */
  /* 🔥 SIMILAR PRODUCTS */
  /* ============================= */

  const { data: similarProducts } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      image,
      product_images(url)
    `)
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .eq("status", "approved")
    .limit(10);

  /* ============================= */
  /* ⭐ REVIEWS */
  /* ============================= */

  const { data: reviews } = await supabase
    .from("reviews")
    .select(`
      *,
      users(name)
    `)
    .eq("product_id", product.id)
    .order("created_at", { ascending: false });

  const avgRating =
    reviews?.length
      ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) /
        reviews.length
      : 0;

  /* ============================= */
  /* 🔥 IMAGE ARRAY */
  /* ============================= */

  const images =
    product.product_images?.length > 0
      ? product.product_images.map((img: any) => img.url)
      : [product.image];

  /* ============================= */
  /* 🔥 PRICE FOR SEO */
  /* ============================= */

  const firstVariant = product.product_variants?.[0];

  const seoPrice =
    firstVariant?.price ||
    (firstVariant?.cost_price || 0) +
      (firstVariant?.platform_margin || 0) ||
    0;

  /* ============================= */
  /* 🚀 UI */
  /* ============================= */

  return (
    <>
      {/* 🔥 STRUCTURED DATA */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: product.name,
            image: images,
            description: product.description,
            brand: {
              "@type": "Brand",
              name: product.manufacturer_name || "Generic Brand",
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: seoPrice,
              availability: "https://schema.org/InStock",
            },
            aggregateRating: reviews?.length
              ? {
                  "@type": "AggregateRating",
                  ratingValue: avgRating.toFixed(1),
                  reviewCount: reviews.length,
                }
              : undefined,
          }),
        }}
      />

      {/* 🛍️ PRODUCT (🔥 UPDATED) */}
      <ProductClient
        product={product}
        isWishlisted={isWishlisted}
      />

      {/* ⭐ REVIEWS */}
      <div className="max-w-4xl mx-auto px-6 mt-16 space-y-10">
        <div>
          <h2 className="text-2xl font-bold">
            ⭐ {avgRating.toFixed(1)} ({reviews?.length || 0} reviews)
          </h2>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Write a Review</h3>
          <ReviewForm productId={product.id} />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Customer Reviews</h3>
          <ReviewsList reviews={reviews} />
        </div>
      </div>

      {/* 🔥 SIMILAR PRODUCTS */}
      <div className="max-w-7xl mx-auto px-6 mt-16">
        <SimilarProducts products={similarProducts} />
      </div>
    </>
  );
}
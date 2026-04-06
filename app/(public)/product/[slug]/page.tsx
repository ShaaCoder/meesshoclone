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
  const { slug } = await params; // ✅ FIX (Next.js 15)

  const supabase = await getSupabaseServer();

  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      product_images(*)
    `)
    .eq("slug", slug)
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
  const { slug } = await params; // ✅ FIX

  const supabase = await getSupabaseServer();

  /* ============================= */
  /* 📦 FETCH PRODUCT (🔥 FIXED) */
  /* ============================= */

 const { data: product, error } = await supabase
  .from("products")
  .select(`
    *,
    product_images(*),
    product_variants(*),
    product_attributes(value, attributes(name))
  `)
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (error || !product) return notFound();

  /* ============================= */
  /* 🔥 SIMILAR PRODUCTS */
  /* ============================= */

  const { data: similarProducts } = await supabase
    .from("products")
    .select("*")
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
            image: images, // ✅ MULTIPLE IMAGES
            description: product.description,
            brand: {
              "@type": "Brand",
              name: product.manufacturer_name || "Generic Brand",
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: product.selling_price,
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

      {/* 🛍️ PRODUCT */}
      <ProductClient product={product} />

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
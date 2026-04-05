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
    .select("*")
    .eq("slug", slug)
    .single();

  if (!product) return {};

  return {
    title: product.meta_title || product.name,
    description: product.meta_description || product.description,

    openGraph: {
      title: product.name,
      description: product.meta_description,
      images: [product.image],
    },

    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.meta_description,
      images: [product.image],
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
  /* 📦 FETCH PRODUCT */
  /* ============================= */

  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      product_variants(*),
      product_attributes(value, attributes(name))
    `)
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (error || !product) return notFound();

  /* ============================= */
  /* 🔥 FETCH SIMILAR PRODUCTS */
  /* ============================= */

  const { data: similarProducts } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .eq("status", "approved")
    .limit(10);

  /* ============================= */
  /* ⭐ FETCH REVIEWS */
  /* ============================= */

  const { data: reviews } = await supabase
    .from("reviews")
    .select(`
      *,
      users(name)
    `)
    .eq("product_id", product.id)
    .order("created_at", { ascending: false });

  /* ============================= */
  /* ⭐ AVERAGE RATING */
  /* ============================= */

  const avgRating =
    reviews?.length
      ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) /
        reviews.length
      : 0;

  /* ============================= */
  /* 🚀 PAGE UI */
  /* ============================= */

  return (
    <>
      {/* 🔥 STRUCTURED DATA (SEO BOOST) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: product.name,
            image: product.image,
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

      {/* ⭐ REVIEWS SECTION */}
      <div className="max-w-4xl mx-auto px-6 mt-16 space-y-10">
        
        {/* ⭐ AVG RATING */}
        <div>
          <h2 className="text-2xl font-bold">
            ⭐ {avgRating.toFixed(1)} ({reviews?.length || 0} reviews)
          </h2>
        </div>

        {/* ✍️ ADD REVIEW */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Write a Review</h3>
          <ReviewForm productId={product.id} />
        </div>

        {/* 📢 REVIEWS LIST */}
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
import { getSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import ProductClient from "./ProductClient";
import SimilarProducts from "@/components/SimilarProducts";
import ReviewForm from "@/components/ReviewForm";
import ReviewsList from "@/components/ReviewsList";
import { calculatePrice } from "@/lib/pricing"; // ✅ USE ENGINE

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

/* ============================= */
/* 🔥 METADATA */
/* ============================= */

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await getSupabaseServer();

  const { data: product } = await supabase
    .from("products")
    .select(`
      name,
      description,
      product_images(url)
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (!product) return {};

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images:
        product.product_images?.map((i: any) => i.url) || [
          "/placeholder.svg",
        ],
    },
  };
}

/* ============================= */
/* 📦 PAGE */
/* ============================= */

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* ============================= */
  /* 📦 PRODUCT */
  /* ============================= */

  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      product_images(url),
      product_variants(*),
      categories(margin_percent)
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (!product) return notFound();

  /* ============================= */
  /* 💰 APPLY PRICING ENGINE */
  /* ============================= */

  const margin = Number(
    product.categories?.margin_percent || 25
  );

  const variantsWithPrice = (product.product_variants || []).map(
    (v: any) => {
      // ✅ If already stored → use it
      if (v.selling_price && v.selling_price > 0) {
        return v;
      }

      // 🔥 Fallback to pricing engine
      const pricing = calculatePrice({
        cost_price: Number(v.cost_price || 0),
        margin_percent: margin,
      });

      return {
        ...v,
        ...pricing,
      };
    }
  );

  product.product_variants = variantsWithPrice;

  /* ============================= */
  /* ❤️ WISHLIST */
  /* ============================= */

  let isWishlisted = false;

  if (user) {
    const { data } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();

    isWishlisted = !!data;
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
      product_images(url),
      product_variants(*)
    `)
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .limit(10);

  /* ============================= */
  /* ⭐ REVIEWS */
  /* ============================= */

  const { data: reviews } = await supabase
    .from("reviews")
    .select(`*, users(name)`)
    .eq("product_id", product.id)
    .order("created_at", { ascending: false });

  const avgRating =
    reviews?.length
      ? reviews.reduce((a: number, r: any) => a + r.rating, 0) /
        reviews.length
      : 0;

  /* ============================= */
  /* 🚀 UI */
  /* ============================= */

  return (
    <>
      <ProductClient
        product={product}
        isWishlisted={isWishlisted}
      />

      {/* REVIEWS */}
      <div className="max-w-4xl mx-auto px-6 mt-16 space-y-10">
        <h2 className="text-2xl font-bold">
          ⭐ {avgRating.toFixed(1)} ({reviews?.length || 0})
        </h2>

        <ReviewForm productId={product.id} />
        <ReviewsList reviews={reviews || []} />
      </div>

      {/* SIMILAR */}
      <div className="max-w-7xl mx-auto px-6 mt-16">
        <SimilarProducts products={similarProducts || []} />
      </div>
    </>
  );
}
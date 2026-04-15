import { getSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import WishlistCard from "@/components/WishlistCard";

export default async function WishlistPage() {
  const supabase = await getSupabaseServer();

  /* ============================= */
  /* 👤 USER */
  /* ============================= */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return notFound();

  /* ============================= */
  /* ❤️ STEP 1: GET WISHLIST IDS */
  /* ============================= */
  const { data: wishlistRaw, error: wError } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user.id);

  if (wError) {
    console.error("Wishlist fetch error:", wError);
  }

  const productIds = wishlistRaw?.map((w) => w.product_id) || [];

  /* ============================= */
  /* 🚫 EMPTY STATE */
  /* ============================= */
  if (!productIds.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-2xl font-bold mb-2">
          Your Wishlist is Empty 💔
        </h1>

        <p className="text-gray-500 mb-6">
          Start adding products you love ❤️
        </p>

        <Link
          href="/"
          className="bg-black text-white px-6 py-3 rounded-xl hover:opacity-90 transition"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  /* ============================= */
  /* ❤️ STEP 2: GET PRODUCTS */
  /* ============================= */
  const { data: products, error: pError } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      image,
      product_images(url),
      product_variants!product_variants_product_id_fkey(*)
    `)
    .in("id", productIds);

  if (pError) {
    console.error("Products fetch error:", pError);
  }

  /* ============================= */
  /* 🧠 SAFETY FILTER */
  /* ============================= */
  const validProducts = products?.filter(Boolean) || [];

  /* ============================= */
  /* 🚀 UI */
  /* ============================= */

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            ❤️ My Wishlist ({validProducts.length})
          </h1>

          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-black transition"
          >
            ← Continue Shopping
          </Link>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">

          {validProducts.map((product: any) => (
            <WishlistCard key={product.id} product={product} />
          ))}

        </div>
      </div>
    </div>
  );
}
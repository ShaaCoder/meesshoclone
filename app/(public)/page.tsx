import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import HomeFiltersBar from "./HomeFiltersBar";
import {
  listCategories,
  listMarketplaceProducts,
  type ProductSort,
} from "@/app/actions/products";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readString(sp: Record<string, any>, key: string) {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function Home({ searchParams }: Props) {
  const sp = await searchParams;

  const q = (readString(sp, "q") || "").toString();
  const category = (readString(sp, "category") || "").toString();
  const sort = ((readString(sp, "sort") || "newest").toString() ||
    "newest") as ProductSort;

  const minPriceRaw = readString(sp, "minPrice");
  const maxPriceRaw = readString(sp, "maxPrice");

  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined;
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined;

  const [categories, listing] = await Promise.all([
    listCategories(),
    listMarketplaceProducts({
      q,
      categoryId: category || undefined,
      sort,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      pageSize: 24,
      page: 1,
    }),
  ]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <section className="bg-gradient-to-br from-violet-50 to-rose-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow text-sm">
                <span className="font-medium">Marketplace</span>
                <span className="text-gray-500">Approved & active products only</span>
              </p>
              <h1 className="text-4xl md:text-5xl font-bold">
                Discover your <span className="text-violet-600">next buy</span>
              </h1>
              <p className="text-gray-600 max-w-xl">
                Variant-based pricing, multi-seller catalog, and production-friendly server rendering.
              </p>
              <div className="pt-2">
                <a
                  href="#products"
                  className="inline-flex bg-black text-white px-6 py-3 rounded-xl"
                >
                  Explore products
                </a>
              </div>
            </div>

            <div className="relative h-[320px] md:h-[380px] rounded-2xl overflow-hidden bg-white shadow">
              <Image
                src={listing.items[0]?.primary_image_url || "/placeholder.svg"}
                alt={listing.items[0]?.name || "Featured product"}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {listing.items[0] && (
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/60 to-transparent text-white">
                  <div className="font-semibold line-clamp-1">
                    {listing.items[0].name}
                  </div>
                  <div className="text-lg">
                    {listing.items[0].min_price === listing.items[0].max_price
                      ? `₹${listing.items[0].min_price}`
                      : `₹${listing.items[0].min_price} - ₹${listing.items[0].max_price}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <HomeFiltersBar categories={categories} />

        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Products</h2>
          <div className="text-sm text-gray-500">{listing.items.length} shown</div>
        </div>

        {listing.items.length === 0 ? (
          <div className="bg-white border rounded-2xl p-10 text-center text-gray-600">
            No products match these filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {listing.items.map((p) => (
              <Link key={p.id} href={`/product/${p.slug || p.id}`}>
                <div className="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition">
                  <div className="relative h-48">
                    <Image
                      src={p.primary_image_url}
                      alt={p.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    {!p.in_stock && (
                      <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-sm font-semibold">
                        Out of stock
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="font-medium line-clamp-2">{p.name}</p>
                    <div className="mt-2 text-lg font-bold">
                      {p.min_price === p.max_price
                        ? `₹${p.min_price}`
                        : `₹${p.min_price} - ₹${p.max_price}`}
                    </div>
                    <div className="flex justify-between mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Star size={14} /> 4.5
                      </span>
                      <span>Free Delivery</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";
import { useDebounce } from "@/hooks/useDebounce";

export default function CategoryClient({ category }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  /* ================= FETCH PRODUCTS ================= */
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

    let query = supabase
  .from("products")
  .select(`
    id,
    name,
    slug,
    image,
    product_variants!product_variants_product_id_fkey (
      price
    )
  `)
  .eq("category_id", category.id);

      // 🔍 SEARCH FILTER (DEBOUNCED)
      if (debouncedSearch) {
        query = query.ilike("name", `%${debouncedSearch}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Fetch error:", error);
      }

      if (data) {
        setProducts(data);
      }

      setLoading(false);
    };

    fetchProducts();
  }, [debouncedSearch, category.id]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-2">
        {category.name}
      </h1>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search in this category..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
      />

      {/* COUNT */}
      <p className="text-gray-500 mb-6">
        {loading ? "Loading..." : `${products.length} products found`}
      </p>

      {/* EMPTY STATE */}
      {!loading && products.length === 0 && (
        <div className="text-gray-500 text-center py-10">
          No products found 😢
        </div>
      )}

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {products.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
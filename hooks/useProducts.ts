import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/* ============================= */
/* TYPES */
/* ============================= */

export interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  created_at?: string;

  image: string;
  minPrice: number;
  maxPrice: number;

  product_variants: any[];
  product_images: any[];
}

/* ============================= */
/* HOOK */
/* ============================= */

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        /* ============================= */
        /* 🚀 FIXED QUERY (IMPORTANT) */
        /* ============================= */
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            name,
            slug,
            category_id,
            created_at,
            image,
            status,
            product_variants!product_variants_product_id_fkey(*),
            product_images!product_images_product_id_fkey(*)
          `)
          .eq("status", "approved"); // 🔥 only show live products

        if (error) throw error;

        /* ============================= */
        /* 🔥 PROCESS */
        /* ============================= */
        const finalProducts: Product[] =
          data?.map((p: any) => {
            const variants = p.product_variants || [];
            const images = p.product_images || [];

            /* ============================= */
            /* 💰 PRICE LOGIC */
            /* ============================= */
            const prices = variants
              .map((v: any) => {
                // 1️⃣ direct price
                if (v.price && Number(v.price) > 0) {
                  return Number(v.price);
                }

                // 2️⃣ cost + margin
                const fallback =
                  Number(v.cost_price || 0) +
                  Number(v.platform_margin || 0);

                if (fallback > 0) return fallback;

                // 3️⃣ mrp fallback
                if (v.mrp && Number(v.mrp) > 0) {
                  return Number(v.mrp);
                }

                return 0;
              })
              .filter((n: number) => n > 0);

            const minPrice = prices.length ? Math.min(...prices) : 0;
            const maxPrice = prices.length ? Math.max(...prices) : 0;

            /* ============================= */
            /* 🖼 IMAGE LOGIC */
            /* ============================= */
            const image =
              images.find((i: any) => i.is_primary)?.url ||
              images[0]?.url ||
              p.image ||
              "/placeholder.png";

            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              category_id: p.category_id,
              created_at: p.created_at,

              image,
              minPrice,
              maxPrice,

              product_variants: variants,
              product_images: images,
            };
          }) || [];

        setProducts(finalProducts);
      } catch (err) {
        console.error("❌ PRODUCT FETCH ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading };
}
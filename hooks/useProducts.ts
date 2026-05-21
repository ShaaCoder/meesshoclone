import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/* ============================= */
/* TYPES */
/* ============================= */

type ProductVariant = {
  id: string;
  product_id: string;
  cost_price?: number;
  mrp?: number;
  price?: number;
  stock?: number;
  size?: string | null;
  color?: string | null;
};

type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  is_primary?: boolean;
};

export interface Product {
  id: string;
  name: string;
  slug?: string;
  category_id: string;
  created_at?: string;

  status?: string;
  approval_status?: string;

  image: string;
  minPrice: number;
  maxPrice: number;

  product_variants: ProductVariant[];
  product_images: ProductImage[];
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
        /* 🚀 QUERY */
        /* ============================= */
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            name,
            slug,
            category_id,
            created_at,
            status,
            approval_status,
            product_variants(*),
            product_images(*)
          `)
          .eq("approval_status", "approved") // ✅ only approved
          .eq("status", "active"); // ✅ only live

        if (error) throw error;

        /* ============================= */
        /* 🔥 PROCESS */
        /* ============================= */
        const finalProducts: Product[] = (data || [])
          /* 🚫 REMOVE INVALID */
          .filter((p: any) => {
            const variants = p.product_variants || [];

            if (!variants.length) return false;

            return variants.some(
              (v: any) =>
                (v.price && v.price > 0) ||
                (v.cost_price && v.cost_price > 0) ||
                (v.mrp && v.mrp > 0)
            );
          })

          /* 🔥 MAP */
          .map((p: any): Product => {
            const variants: ProductVariant[] = p.product_variants || [];
            const images: ProductImage[] = p.product_images || [];

            /* 💰 PRICE */
            const prices = variants
              .map((v) => {
                if (v.price && v.price > 0) return Number(v.price);
                if (v.cost_price && v.cost_price > 0) return Number(v.cost_price);
                if (v.mrp && v.mrp > 0) return Number(v.mrp);
                return 0;
              })
              .filter((n) => n > 0);

            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            /* 🖼 IMAGE */
            const image =
              images.find((i) => i.is_primary)?.url ||
              images[0]?.url ||
              "/placeholder.svg";

            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              category_id: p.category_id,
              created_at: p.created_at,

              status: p.status,
              approval_status: p.approval_status,

              image,
              minPrice,
              maxPrice,

              product_variants: variants,
              product_images: images,
            };
          });

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
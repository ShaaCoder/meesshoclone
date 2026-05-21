"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { getVariantSellingPrice } from "@/lib/pricing";

export type ProductSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc";

export type ProductListingQuery = {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

export type CategoryListItem = {
  id: string;
  name: string;
  slug?: string | null;
};

export type ProductListItem = {
  id: string;
  name: string;
  slug: string | null;
  category_id: string;
  seller_id: string | null;
  primary_image_url: string;
  min_price: number;
  max_price: number;
  in_stock: boolean;
};

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function listCategories(): Promise<CategoryListItem[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  return (data || []) as CategoryListItem[];
}

export async function listMarketplaceProducts(
  input: ProductListingQuery
): Promise<{ items: ProductListItem[]; total: number }> {
  const supabase = await getSupabaseServer();

  const pageSize = Math.min(Math.max(input.pageSize ?? 24, 1), 48);
  const page = Math.max(input.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        category_id,
        seller_id,
        created_at,
        status,
        approval_status,
        categories ( margin_percent ),
        product_images ( url, is_primary ),
        product_variants ( cost_price, selling_price, stock )
      `,
      { count: "exact" }
    )
    .eq("status", "active")
    .eq("approval_status", "approved");

  if (input.categoryId) {
    query = query.eq("category_id", input.categoryId);
  }

  if (input.q && input.q.trim()) {
    query = query.ilike("name", `%${input.q.trim()}%`);
  }

  // Fetch a bounded window, then compute variant-based price range + filter/sort in Node.
  // (For very large catalogs, move min/max price + filters into an RPC/view.)
  query = query.order("created_at", { ascending: false });

  let data: any[] | null = null;
  let count: number | null = null;
  try {
    const res = await query.range(from, to);
    data = (res.data || []) as any[];
    count = res.count ?? null;
    if (res.error) throw new Error(res.error.message);
  } catch (e: any) {
    // Undici/Node fetch errors often show up as "TypeError: fetch failed"
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasUrl = Boolean(url && String(url).startsWith("http"));
    throw new Error(
      [
        "Failed to fetch products from Supabase.",
        `hasSupabaseUrl=${hasUrl}`,
        e?.message ? `cause=${e.message}` : "",
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  const rows = (data || []) as any[];

  const items: ProductListItem[] = rows
    .map((p) => {
      const margin = toNumber(p.categories?.margin_percent, 25);
      const variants = (p.product_variants || []) as any[];
      const images = (p.product_images || []) as any[];

      const sellingPrices = variants
        .map((v) =>
          getVariantSellingPrice({
            cost_price: v.cost_price,
            selling_price: v.selling_price,
            margin_percent: margin,
          })
        )
        .filter((n) => n > 0);

      const min_price = sellingPrices.length ? Math.min(...sellingPrices) : 0;
      const max_price = sellingPrices.length ? Math.max(...sellingPrices) : 0;

      const primary_image_url =
        images.find((i) => i.is_primary)?.url ||
        images[0]?.url ||
        "/placeholder.svg";

      const in_stock = variants.some((v) => toNumber(v.stock, 0) > 0);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug ?? null,
        category_id: p.category_id,
        seller_id: p.seller_id ?? null,
        primary_image_url,
        min_price,
        max_price,
        in_stock,
      };
    })
    .filter((p) => p.min_price > 0);

  const filtered = items.filter((p) => {
    if (input.minPrice != null && p.max_price < input.minPrice) return false;
    if (input.maxPrice != null && p.min_price > input.maxPrice) return false;
    return true;
  });

  const sort = input.sort ?? "newest";
  filtered.sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return a.min_price - b.min_price;
      case "price_desc":
        return b.min_price - a.min_price;
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "newest":
      default:
        return 0; // DB order is fine (created_at not selected here)
    }
  });

  return { items: filtered, total: count || 0 };
}


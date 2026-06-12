"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { getVariantSellingPrice } from "@/lib/pricing";

/* ============================= */
/* TYPES */
/* ============================= */

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

  category_name?: string | null;

  primary_image_url: string;

  min_price: number;

  max_price: number;

  total_stock: number;

  total_variants: number;

  in_stock: boolean;

  approval_status?: string | null;

  created_at?: string | null;

  attributes_preview?: Record<
    string,
    string
  >;
};

/* ============================= */
/* HELPERS */
/* ============================= */

function toNumber(
  value: unknown,
  fallback = 0
) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

/* ============================= */
/* LIST CATEGORIES */
/* ============================= */

export async function listCategories(): Promise<
  CategoryListItem[]
> {
  const supabase =
    await getSupabaseServer();

  const { data } =
    await supabase
      .from("categories")
      .select(`
        id,
        name,
        slug
      `)
      .order("name", {
        ascending: true,
      });

  return (
    (data || []) as CategoryListItem[]
  );
}

/* ============================= */
/* MARKETPLACE PRODUCTS */
/* ============================= */

export async function listMarketplaceProducts(
  input: ProductListingQuery
): Promise<{
  items: ProductListItem[];
  total: number;
}> {
  const supabase =
    await getSupabaseServer();

  /* ============================= */
  /* PAGINATION */
  /* ============================= */

  const pageSize = Math.min(
    Math.max(
      input.pageSize ?? 24,
      1
    ),
    48
  );

  const page = Math.max(
    input.page ?? 1,
    1
  );

  const from =
    (page - 1) * pageSize;

  const to =
    from + pageSize - 1;

  /* ============================= */
  /* QUERY */
  /* ============================= */

  let query = supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        category_id,
        seller_id,
        status,
        approval_status,
        created_at,

        categories (
          id,
          name,
          margin_percent
        ),

        product_images (
          id,
          url,
          is_primary
        ),

        product_variants (
          id,
          attributes,
          stock,
          reserved_stock,
          cost_price,
          mrp,
          selling_price,
          platform_margin,
          seller_profit
        )
      `,
      {
        count: "exact",
      }
    )
    .eq("status", "active")
    .eq(
      "approval_status",
      "approved"
    );

  /* ============================= */
  /* FILTERS */
  /* ============================= */

  if (input.categoryId) {
    query = query.eq(
      "category_id",
      input.categoryId
    );
  }

  if (
    input.q &&
    input.q.trim()
  ) {
    query = query.ilike(
      "name",
      `%${input.q.trim()}%`
    );
  }

  /* ============================= */
  /* ORDER */
  /* ============================= */

  query = query.order(
    "created_at",
    {
      ascending: false,
    }
  );

  /* ============================= */
  /* FETCH */
  /* ============================= */

  let data:
    | any[]
    | null = null;

  let count:
    | number
    | null = null;

  try {
    const res =
      await query.range(
        from,
        to
      );

    data = (res.data ||
      []) as any[];

    count =
      res.count ?? null;

    if (res.error) {
      throw new Error(
        res.error.message
      );
    }
  } catch (e: any) {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const hasUrl =
      Boolean(
        url &&
          String(
            url
          ).startsWith(
            "http"
          )
      );

    throw new Error(
      [
        "Failed to fetch marketplace products.",

        `hasSupabaseUrl=${hasUrl}`,

        e?.message
          ? `cause=${e.message}`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  /* ============================= */
  /* FORMAT */
  /* ============================= */

  const rows =
    (data || []) as any[];

  const items: ProductListItem[] =
    rows
      .map((product) => {
        const category =
          product.categories;

        const margin =
          toNumber(
            category?.margin_percent,
            25
          );

        const variants =
          (
            product.product_variants ||
            []
          ).filter(
            (v: any) =>
              Number(
                v.stock || 0
              ) > 0
          );

        const images =
          product.product_images ||
          [];

        /* ============================= */
        /* PRICES */
        /* ============================= */

        const sellingPrices =
          variants
            .map((variant: any) =>
              getVariantSellingPrice(
                {
                  cost_price:
                    variant.cost_price,

                  selling_price:
                    variant.selling_price,

                  margin_percent:
                    margin,
                }
              )
            )
            .filter(
              (n: number) =>
                n > 0
            );

        const min_price =
          sellingPrices.length
            ? Math.min(
                ...sellingPrices
              )
            : 0;

        const max_price =
          sellingPrices.length
            ? Math.max(
                ...sellingPrices
              )
            : 0;

        /* ============================= */
        /* STOCK */
        /* ============================= */

        const total_stock =
          variants.reduce(
            (
              total: number,
              variant: any
            ) =>
              total +
              toNumber(
                variant.stock,
                0
              ),
            0
          );

        const in_stock =
          total_stock > 0;

        /* ============================= */
        /* IMAGE */
        /* ============================= */

        const primary_image_url =
          images.find(
            (img: any) =>
              img.is_primary
          )?.url ||
          images[0]?.url ||
          "/placeholder.svg";

        /* ============================= */
        /* ATTRIBUTES */
        /* ============================= */

        const attributes_preview =
          variants?.[0]
            ?.attributes ||
          {};

        return {
          id: product.id,

          name:
            product.name,

          slug:
            product.slug ??
            null,

          category_id:
            product.category_id,

          seller_id:
            product.seller_id ??
            null,

          category_name:
            category?.name ??
            null,

          primary_image_url,

          min_price,

          max_price,

          total_stock,

          total_variants:
            variants.length,

          in_stock,

          approval_status:
            product.approval_status,

          created_at:
            product.created_at,

          attributes_preview,
        };
      })

      /* REMOVE INVALID */
      .filter(
        (product) =>
          product.min_price >
          0
      );

  /* ============================= */
  /* PRICE FILTER */
  /* ============================= */

  const filtered =
    items.filter(
      (product) => {
        if (
          input.minPrice !=
            null &&
          product.max_price <
            input.minPrice
        ) {
          return false;
        }

        if (
          input.maxPrice !=
            null &&
          product.min_price >
            input.maxPrice
        ) {
          return false;
        }

        return true;
      }
    );

  /* ============================= */
  /* SORT */
  /* ============================= */

  const sort =
    input.sort ??
    "newest";

  filtered.sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return (
          a.min_price -
          b.min_price
        );

      case "price_desc":
        return (
          b.min_price -
          a.min_price
        );

      case "name_asc":
        return a.name.localeCompare(
          b.name
        );

      case "name_desc":
        return b.name.localeCompare(
          a.name
        );

      case "newest":
      default:
        return 0;
    }
  });

  /* ============================= */
  /* RETURN */
  /* ============================= */

  return {
    items: filtered,
    total: count || 0,
  };
}
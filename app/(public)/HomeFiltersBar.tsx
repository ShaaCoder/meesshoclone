"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CategoryListItem, ProductSort } from "@/app/actions/products";

function withParam(params: URLSearchParams, key: string, value?: string) {
  const next = new URLSearchParams(params.toString());
  if (!value) next.delete(key);
  else next.set(key, value);
  next.delete("page");
  return next;
}

export default function HomeFiltersBar({
  categories,
}: {
  categories: CategoryListItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = useMemo(() => {
    const q = searchParams.get("q") || "";
    const categoryId = searchParams.get("category") || "all";
    const sort = (searchParams.get("sort") || "newest") as ProductSort;
    const minPrice = searchParams.get("minPrice") || "";
    const maxPrice = searchParams.get("maxPrice") || "";
    return { q, categoryId, sort, minPrice, maxPrice };
  }, [searchParams]);

  const [q, setQ] = useState(current.q);

  function push(nextParams: URLSearchParams) {
    startTransition(() => {
      router.push(`${pathname}?${nextParams.toString()}`);
    });
  }

  return (
    <div className="bg-white border rounded-2xl p-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500">Search</label>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            />
            <button
              onClick={() => push(withParam(searchParams, "q", q.trim()))}
              className="px-4 py-2 rounded-xl bg-black text-white"
              disabled={isPending}
            >
              Apply
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500">Category</label>
          <select
            value={current.categoryId}
            onChange={(e) => {
              const v = e.target.value;
              push(withParam(searchParams, "category", v === "all" ? "" : v));
            }}
            className="w-full border rounded-xl px-3 py-2"
            disabled={isPending}
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500">Sort</label>
          <select
            value={current.sort}
            onChange={(e) => push(withParam(searchParams, "sort", e.target.value))}
            className="w-full border rounded-xl px-3 py-2"
            disabled={isPending}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="name_asc">Name: A → Z</option>
            <option value="name_desc">Name: Z → A</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:w-[320px]">
        <div>
          <label className="text-xs text-gray-500">Min price</label>
          <input
            inputMode="numeric"
            value={current.minPrice}
            onChange={(e) =>
              push(withParam(searchParams, "minPrice", e.target.value.replace(/[^\d]/g, "")))
            }
            placeholder="0"
            className="w-full border rounded-xl px-3 py-2"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Max price</label>
          <input
            inputMode="numeric"
            value={current.maxPrice}
            onChange={(e) =>
              push(withParam(searchParams, "maxPrice", e.target.value.replace(/[^\d]/g, "")))
            }
            placeholder="99999"
            className="w-full border rounded-xl px-3 py-2"
            disabled={isPending}
          />
        </div>
        <button
          onClick={() => push(new URLSearchParams())}
          className="col-span-2 px-4 py-2 rounded-xl border"
          disabled={isPending}
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}


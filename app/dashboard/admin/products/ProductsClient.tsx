"use client";

import { useState, useTransition } from "react";
import { updateProductStatus } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import { Check, X, Search } from "lucide-react";

export default function ProductsClient({ products }: any) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [search, setSearch] = useState("");

  /* 🔥 FORMAT ₹ */
  const format = (n: number) => `₹${Math.round(n)}`;

  /* 🔥 FILTER */
  const filtered = products?.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  /* 🔥 SORT (Pending First) */
  const sorted = filtered.sort((a: any, b: any) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return 0;
  });

  const pending = products.filter((p: any) => p.status === "pending").length;

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Approval</h1>
          <p className="text-gray-500 text-sm">
            {pending} products need review
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            className="pl-10 pr-4 py-2 border rounded-xl"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-2xl border overflow-hidden">

        {sorted.map((p: any) => {
const min = p.minPrice || 0;
const max = p.maxPrice || 0;

const minProfit = p.minProfit || 0;
const maxProfit = p.maxProfit || 0;

          return (
            <div
              key={p.id}
              className="grid grid-cols-12 items-center gap-4 px-5 py-4 border-b hover:bg-gray-50 transition group"
            >

              {/* PRODUCT */}
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  📦
                </div>

                <div>
                  <p className="font-semibold text-gray-800">
                    {p.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.users?.name}
                  </p>
                </div>
              </div>

            {/* PRICE RANGE */}
<div className="col-span-3 text-sm">
  <p className="text-gray-400 text-xs">Price</p>
  <p className="font-semibold">
    ₹{min}
    {max > min && ` - ₹${max}`}
  </p>
</div>
{/* PROFIT */}
<div className="col-span-2 text-sm">
  <p className="text-gray-400 text-xs">Profit</p>
  <p className="font-bold text-green-600">
    ₹{minProfit}
    {maxProfit > minProfit && ` - ₹${maxProfit}`}
  </p>
</div>

             <div className="col-span-2 text-sm">
  <p className="text-gray-400 text-xs">Variants</p>
  <p>{p.variants.length}</p>
</div>

              {/* STATUS */}
              <div className="col-span-1">
                <Status status={p.status} />
              </div>

              {/* ACTIONS */}
              <div className="col-span-1 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">

                {p.status === "pending" && (
                  <>
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          await updateProductStatus(p.id, "approved");
                          router.refresh();
                        })
                      }
                      className="bg-green-500 text-white p-2 rounded-lg"
                    >
                      <Check size={16} />
                    </button>

                    <button
                      onClick={() =>
                        startTransition(async () => {
                          await updateProductStatus(p.id, "rejected");
                          router.refresh();
                        })
                      }
                      className="bg-red-500 text-white p-2 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>

            </div>
          );
        })}

        {sorted.length === 0 && (
          <div className="p-6 text-center text-gray-400">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}

/* STATUS */
function Status({ status }: any) {
  if (status === "approved")
    return <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">Approved</span>;

  if (status === "pending")
    return <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full">Pending</span>;

  if (status === "rejected")
    return <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Rejected</span>;

  return null;
}
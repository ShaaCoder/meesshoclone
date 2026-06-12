"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  approveProduct,
  rejectProduct,
} from "@/app/actions/admin";

import { useRouter } from "next/navigation";

import {
  Check,
  X,
  Search,
  Package,
  IndianRupee,
  Layers3,
  User,
  Calendar,
} from "lucide-react";

export default function ProductsClient({
  products,
}: any) {

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const router = useRouter();

  const [search, setSearch] =
    useState("");

  /* FILTER */

  const filtered =
    products.filter((p: any) =>
      p.name
        ?.toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  /* SORT */

  const sorted = [
    ...filtered,
  ].sort((a: any, b: any) => {

    if (
      a.approval_status ===
      "pending"
    ) {
      return -1;
    }

    if (
      b.approval_status ===
      "pending"
    ) {
      return 1;
    }

    return 0;
  });

  const pendingCount =
    products.filter(
      (p: any) =>
        p.approval_status ===
        "pending"
    ).length;

  return (
    <div className="space-y-8">

      {/* HEADER */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

        <div>

          <h1 className="text-4xl font-black ">
            Product Approval
          </h1>

          <p className="text-zinc-500 mt-2">
            {pendingCount} products waiting for approval
          </p>
        </div>

        {/* SEARCH */}

        <div className="relative w-full lg:w-[320px]">

          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search products..."
            className="w-full h-14 rounded-2xl bg-zinc-900 border border-zinc-800 pl-12 pr-4  outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* PRODUCTS */}

      <div className="space-y-6">

        {sorted.map((p: any) => {

          const image =
            p.product_images?.find(
              (img: any) =>
                img.is_primary
            )?.url ||
            p.product_images?.[0]
              ?.url ||
            "/placeholder.png";

          return (
            <div
              key={p.id}
              className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[32px] overflow-hidden"
            >

              <div className="p-6">

                <div className="flex flex-col xl:flex-row gap-6">

                  {/* IMAGE */}
{/* IMAGE GALLERY */}

<div className="xl:w-[260px] space-y-4">

  {/* MAIN IMAGE */}

  <img
    src={image}
    alt=""
    className="w-full h-56 object-cover rounded-3xl border border-zinc-800"
  />

  {/* GALLERY */}

  {p.product_images?.length >
    1 && (

    <div className="grid grid-cols-4 gap-3">

      {p.product_images
        ?.slice(0, 8)
        .map(
          (
            img: any,
            index: number
          ) => (

            <a
              key={index}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative"
            >

              <img
                src={img.url}
                alt=""
                className="w-full h-16 object-cover rounded-2xl border border-zinc-800 group-hover:scale-105 transition"
              />

              {/* PRIMARY */}

              {img.is_primary && (

                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-lg bg-green-500 text-[10px] font-bold text-white">
                  PRIMARY
                </div>
              )}
            </a>
          )
        )}
    </div>
  )}

  {/* IMAGE COUNT */}

  <div className="h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm text-zinc-400">

    {p.product_images?.length || 0}{" "}
    Product Images
  </div>
</div>

                  {/* INFO */}

                  <div className="flex-1">

                    {/* TOP */}

                    <div className="flex flex-wrap items-center gap-3">

                      <Status
                        status={
                          p.approval_status
                        }
                      />

                      <div className="px-4 h-10 rounded-2xl bg-zinc-800 text-zinc-300 text-sm flex items-center gap-2">

                        <Layers3 className="w-4 h-4" />

                        {
                          p.categories
                            ?.name
                        }
                      </div>
                    </div>

                    {/* NAME */}

                    <h2 className="text-3xl font-black text-white mt-5 leading-tight">
                      {p.name}
                    </h2>

                    {/* DESCRIPTION */}

                    <p className="text-zinc-400 mt-4 leading-relaxed max-w-4xl">
                      {p.description ||
                        "No description"}
                    </p>

                    {/* META */}

                    <div className="flex flex-wrap gap-6 mt-6 text-sm">

                      <div className="flex items-center gap-2 text-zinc-400">

                        <User className="w-4 h-4" />

                        {
                          p.users
                            ?.name
                        }
                      </div>

                      <div className="flex items-center gap-2 text-zinc-400">

                        <Calendar className="w-4 h-4" />

                        {new Date(
                          p.created_at
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-zinc-400">

                        <Package className="w-4 h-4" />

                        {
                          p.variants
                            ?.length
                        }{" "}
                        variants
                      </div>
                    </div>

                    {/* VARIANTS */}

                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-8">

                      {p.variants?.map(
                        (
                          v: any,
                          i: number
                        ) => (
                          <div
                            key={i}
                            className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
                          >

                            <div className="flex items-center justify-between">

                              <div>

                                <p className="text-white font-bold">
                                  {v.color ||
                                    "Default"}
                                </p>

                                <p className="text-zinc-500 text-sm">
                                  Size:{" "}
                                  {v.size ||
                                    "-"}
                                </p>
                              </div>

                              <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center">

                                <IndianRupee className="w-5 h-5 text-green-400" />
                              </div>
                            </div>

                            <div className="mt-5 space-y-2 text-sm">

                              <div className="flex justify-between">

                                <span className="text-zinc-500">
                                  Cost
                                </span>

                                <span className="text-white font-medium">
                                  ₹
                                  {
                                    v.cost_price
                                  }
                                </span>
                              </div>

                              <div className="flex justify-between">

                                <span className="text-zinc-500">
                                  Selling
                                </span>

                                <span className="text-white font-medium">
                                  ₹
                                  {
                                    v.selling_price
                                  }
                                </span>
                              </div>

                              <div className="flex justify-between">

                                <span className="text-zinc-500">
                                  Margin
                                </span>

                                <span className="text-green-400 font-bold">
                                  ₹
                                  {
                                    v.platform_margin
                                  }
                                </span>
                              </div>

                              <div className="flex justify-between">

                                <span className="text-zinc-500">
                                  Stock
                                </span>

                                <span className="text-white font-medium">
                                  {v.stock}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="xl:w-[220px] flex flex-col gap-4">

                    {p.approval_status ===
                      "pending" && (
                      <>
                        <button
                          disabled={
                            isPending
                          }
                          onClick={() =>
                            startTransition(
                              async () => {
                                await approveProduct(
                                  p.id
                                );

                                router.refresh();
                              }
                            )
                          }
                          className="h-14 rounded-2xl bg-green-600 hover:bg-green-700 transition text-white font-bold flex items-center justify-center gap-2"
                        >

                          <Check className="w-5 h-5" />

                          Approve
                        </button>

                        <button
                          disabled={
                            isPending
                          }
                          onClick={() =>
                            startTransition(
                              async () => {
                                await rejectProduct(
                                  p.id
                                );

                                router.refresh();
                              }
                            )
                          }
                          className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 transition text-white font-bold flex items-center justify-center gap-2"
                        >

                          <X className="w-5 h-5" />

                          Reject
                        </button>
                      </>
                    )}

                    {p.approval_status ===
                      "approved" && (
                      <div className="h-14 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center font-bold">
                        Approved
                      </div>
                    )}

                    {p.approval_status ===
                      "rejected" && (
                      <div className="h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center font-bold">
                        Rejected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!sorted.length && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-20 text-center text-zinc-500">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}

/* STATUS */

function Status({
  status,
}: any) {

  if (
    status === "approved"
  ) {
    return (
      <div className="px-4 h-10 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold flex items-center">
        Approved
      </div>
    );
  }

  if (
    status === "pending"
  ) {
    return (
      <div className="px-4 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-semibold flex items-center">
        Pending Review
      </div>
    );
  }

  if (
    status === "rejected"
  ) {
    return (
      <div className="px-4 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold flex items-center">
        Rejected
      </div>
    );
  }

  return null;
}
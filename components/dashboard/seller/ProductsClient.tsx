"use client";

import Link from "next/link";
import { useTransition } from "react";

import { deleteProduct } from "@/app/actions/seller";

import ProductForm from "./ProductForm";

/* ============================= */
/* MAIN */
/* ============================= */

export default function ProductsClient({
  products,
  categories,
}: any) {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  return (
    <div className="space-y-6 text-black">
      {/* ============================= */}
      {/* ADD PRODUCT */}
      {/* ============================= */}

      <ProductForm
        mode="create"
        categories={categories}
      />

      {/* ============================= */}
      {/* EMPTY */}
      {/* ============================= */}

      {!products.length ? (
        <div className="border rounded-2xl p-10 text-center">
          <p className="text-gray-500">
            No products yet
          </p>
        </div>
      ) : (
        /* ============================= */
        /* PRODUCTS GRID */
        /* ============================= */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(
            (p: any) => {
              const image =
                p.product_images?.find(
                  (
                    img: any
                  ) =>
                    img.is_primary
                )?.url ||
                p
                  .product_images?.[0]
                  ?.url ||
                "/placeholder.png";

              const variantCount =
                p.product_variants
                  ?.length || 0;

              return (
                <div
                  key={p.id}
                  className="border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition"
                >
                  {/* IMAGE */}
                  <img
                    src={image}
                    className="h-48 w-full object-cover"
                  />

                  {/* CONTENT */}
                  <div className="p-4 space-y-2">
                    {/* NAME */}
                    <h3 className="font-semibold line-clamp-2">
                      {p.name}
                    </h3>

                    {/* STATUS */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {p.status}
                      </span>

                      <span className="text-gray-500">
                        {
                          variantCount
                        }{" "}
                        variants
                      </span>
                    </div>

                    {/* CATEGORY */}
                    <p className="text-sm text-gray-500">
                      {
                        p
                          .categories
                          ?.name
                      }
                    </p>

                    {/* ACTIONS */}
                    <div className="flex gap-2 pt-2">
                      {/* EDIT */}
                      <Link
                        href={`/dashboard/seller/products/${p.id}`}
                        className="flex-1 text-center bg-black text-white px-3 py-2 rounded-xl text-sm"
                      >
                        Edit
                      </Link>

                      {/* DELETE */}
                      <button
                        disabled={
                          isPending
                        }
                        onClick={() => {
                          if (
                            !confirm(
                              "Archive this product?"
                            )
                          ) {
                            return;
                          }

                          startTransition(
                            async () => {
                              const res =
                                await deleteProduct(
                                  p.id
                                );

                              if (
                                !res?.success
                              ) {
                                alert(
                                  res?.message ||
                                    "Delete failed"
                                );
                              }
                            }
                          );
                        }}
                        className="flex-1 bg-red-500 text-white px-3 py-2 rounded-xl text-sm"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
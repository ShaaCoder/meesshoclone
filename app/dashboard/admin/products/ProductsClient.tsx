"use client";

import { useTransition } from "react";
import { updateProductStatus } from "@/app/actions/admin";
import { useRouter } from "next/navigation";

export default function ProductsClient({ products }: any) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-black">Product Approval</h1>

      <div className="bg-white shadow rounded-xl overflow-hidden text-black">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Product</th>
              <th>Seller</th>
              <th>Base Price</th>
              <th>Selling Price</th>
              <th>Profit</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products?.map((p: any) => {
              const base = Number(p.base_price);
              const selling = Number(p.selling_price);
              const profit = selling - base;

              return (
                <tr key={p.id} className="border-t hover:bg-gray-50">

                  {/* PRODUCT */}
                  <td className="p-3 font-medium">{p.name}</td>

                  {/* SELLER */}
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {p.users?.name || "Unknown"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {p.users?.email}
                      </span>
                    </div>
                  </td>

                  {/* BASE PRICE */}
                  <td className="text-gray-700">₹{base}</td>

                  {/* SELLING PRICE */}
                  <td className="font-semibold">₹{selling}</td>

                  {/* PROFIT */}
                  <td
                    className={`font-semibold ${
                      profit > 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    ₹{profit}
                  </td>

                  {/* STATUS */}
                  <td>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        p.status === "approved"
                          ? "bg-green-100 text-green-600"
                          : p.status === "rejected"
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="text-center space-x-2">
                    {p.status === "pending" && (
                      <>
                        <button
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await updateProductStatus(p.id, "approved");
                              router.refresh();
                            })
                          }
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Approve
                        </button>

                        <button
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await updateProductStatus(p.id, "rejected");
                              router.refresh();
                            })
                          }
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
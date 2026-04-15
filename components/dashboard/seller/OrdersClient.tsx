"use client";

import { useState } from "react";
import { updateOrderStatus } from "@/app/actions/seller";

export default function OrdersClient({ orders }: any) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  /* FILTER LOGIC */
  const filtered = orders.filter((o: any) => {
    const matchFilter = filter === "all" || o.status === filter;
    const matchSearch =
      o.order_code?.toLowerCase().includes(search.toLowerCase()) ||
      o.id?.toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });

  /* BULK ACTION */
  const bulkUpdate = async (status: string) => {
    for (const id of selected) {
      await updateOrderStatus(id, status);
    }
    location.reload();
  };

  return (
    <div className="space-y-6">

      {/* 🔍 SEARCH + FILTER */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">

        {/* SEARCH */}
        <input
          placeholder="Search order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 px-4 py-3 rounded-xl w-full md:w-80"
        />

        {/* FILTER TABS */}
        <div className="flex gap-2">
          {["all", "pending", "accepted", "delivered"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm ${
                filter === f
                  ? "bg-emerald-600"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 🔥 BULK ACTIONS */}
      {selected.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={() => bulkUpdate("accepted")}
            className="bg-green-600 px-4 py-2 rounded-lg"
          >
            Bulk Accept ({selected.length})
          </button>

          <button
            onClick={() => bulkUpdate("rejected")}
            className="bg-red-600 px-4 py-2 rounded-lg"
          >
            Bulk Reject
          </button>
        </div>
      )}

      {/* ORDERS */}
      <div className="space-y-4">
        {filtered.map((order: any) => (
          <OrderRow
            key={order.id}
            order={order}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
      </div>
    </div>
  );
}
function OrderRow({ order, selected, setSelected }: any) {
  const isChecked = selected.includes(order.id);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">

      {/* LEFT */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => {
            if (e.target.checked) {
              setSelected([...selected, order.id]);
            } else {
              setSelected(selected.filter((id: string) => id !== order.id));
            }
          }}
        />

        <div>
          <p className="text-sm text-zinc-400">#{order.order_code}</p>
          <p className="text-white text-sm">{order.items.length} items</p>
        </div>
      </div>

      {/* STATUS DROPDOWN 🔥 */}
      <select
        defaultValue={order.status}
        onChange={(e) =>
          updateOrderStatus(order.id, e.target.value)
        }
        className="bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-lg text-sm"
      >
        <option value="pending">Pending</option>
        <option value="accepted">Accepted</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="rejected">Rejected</option>
      </select>

      {/* RIGHT */}
      <div className="text-right">
        <p className="text-sm text-zinc-400">Total</p>
        <p className="text-white font-semibold">
          ₹
          {order.items.reduce(
            (sum: number, i: any) =>
              sum + i.quantity * (i.base_price || i.price || 0),
            0
          )}
        </p>
      </div>
    </div>
  );
}
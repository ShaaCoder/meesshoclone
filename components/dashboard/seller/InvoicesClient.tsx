"use client";

import { useState } from "react";
import { Eye, Download } from "lucide-react";

export default function InvoicesClient({ invoices }: any) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const filtered = invoices.filter((inv: any) => {
    const matchSearch = inv.invoice_number
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const matchFilter =
      filter === "all" || inv.status === filter;

    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">

      {/* SEARCH */}
      <input
        placeholder="Search invoice..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-lg text-black"
      />

      {/* FILTER */}
      <div className="flex gap-2">
        {["all", "paid", "pending"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg ${
              filter === f ? "bg-emerald-600" : "bg-zinc-800"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* LIST */}
      {filtered.map((inv: any) => (
        <div
          key={inv.id}
          className="bg-zinc-900 p-4 rounded-xl flex justify-between"
        >
          <div>
            <p>{inv.invoice_number}</p>
            <p className="text-xs text-zinc-500">
              {new Date(inv.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedInvoice(inv)}
              className="bg-zinc-800 px-3 py-2 rounded"
            >
              <Eye size={16} />
            </button>

            <a
              href={inv.pdf_url}
              target="_blank"
              className="bg-emerald-600 px-3 py-2 rounded"
            >
              <Download size={16} />
            </a>
          </div>
        </div>
      ))}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded-xl">
            <h2>{selectedInvoice.invoice_number}</h2>
            <button onClick={() => setSelectedInvoice(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
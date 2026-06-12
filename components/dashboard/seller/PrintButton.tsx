"use client";

export default function PrintInvoiceButton() {

  return (
    <button
      onClick={() => window.print()}
      className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-zinc-800 transition"
    >
      Print Invoice
    </button>
  );
}
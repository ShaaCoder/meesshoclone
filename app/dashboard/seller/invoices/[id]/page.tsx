import Link from "next/link";

import { notFound } from "next/navigation";

import { format } from "date-fns";

import {
  ArrowLeft,
  Download,
  FileText,
  Package,
  Truck,
  CreditCard,
  MapPin,
} from "lucide-react";

import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } =
    await params;

  /* ============================= */
  /* 📦 FETCH ORDER */
  /* ============================= */

  const {
    data: order,
    error,
  } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      
      addresses (*),

      users (
        name,
        email,
        phone
      ),

      order_items (
        *,
        
        products (
          id,
          name,

          product_images (
            url,
            is_primary
          )
        )
      )
    `)
    .eq("id", id)
    .single();

  /* ============================= */
  /* 🧪 DEBUG */
  /* ============================= */

  if (error) {
    console.log(
      "INVOICE FETCH ERROR:",
      error
    );
  }

  if (!order) {
    console.log(
      "ORDER NOT FOUND:",
      id
    );
  }

  if (error || !order) {
    notFound();
  }

  /* ============================= */
  /* 📍 DATA */
  /* ============================= */

  const address =
    order.addresses;

  const items =
    order.order_items || [];

  /* ============================= */
  /* 💰 TOTALS */
  /* ============================= */

  const subtotal =
    items.reduce(
      (
        sum: number,
        item: any
      ) =>
        sum +
        Number(
          item.final_price || 0
        ) *
          Number(
            item.quantity || 0
          ),
      0
    );

  const shipping =
    Number(
      order.shipping_cost || 0
    );

  const total =
    Number(
      order.total_amount || 0
    );

  const gst = Math.max(
    total -
      subtotal -
      shipping,
    0
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/seller/orders"
              className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <h1 className="text-2xl font-black">
                Invoice
              </h1>

              <p className="text-sm text-zinc-400 mt-1">
                {
                  order.order_code
                }
              </p>
            </div>
          </div>

          {/* DOWNLOAD */}

          <a
            href={`/api/invoice/${order.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-2xl font-bold inline-flex items-center gap-3 transition"
          >
            <Download className="w-5 h-5" />

            Download PDF
          </a>
        </div>
      </div>

      {/* ============================= */}
      {/* BODY */}
      {/* ============================= */}

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* ============================= */}
          {/* LEFT */}
          {/* ============================= */}

          <div className="lg:col-span-2 space-y-6">
            {/* INVOICE */}

            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden">
              {/* HEADER */}

              <div className="p-8 border-b border-zinc-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-white text-black flex items-center justify-center mb-5">
                      <FileText className="w-8 h-8" />
                    </div>

                    <h2 className="text-4xl font-black">
                      TAX INVOICE
                    </h2>

                    <p className="text-zinc-400 mt-2">
                      Marketplace
                      Seller
                      Invoice
                    </p>
                  </div>

                  <div className="text-right">
                    <h3 className="text-3xl font-black">
                      YourShop
                    </h3>

                    <p className="text-zinc-400 mt-2">
                      India
                      Marketplace
                    </p>

                    <p className="text-zinc-500 text-sm mt-1">
                      support@YourShop.com
                    </p>
                  </div>
                </div>
              </div>

              {/* INFO */}

              <div className="grid md:grid-cols-2 border-b border-zinc-800">
                {/* ADDRESS */}

                <div className="p-8 border-r border-zinc-800">
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-5 h-5 text-zinc-400" />

                    <h3 className="font-bold text-xl">
                      Billing
                      Address
                    </h3>
                  </div>

                  <div className="space-y-3 text-zinc-300">
                    <p className="text-lg font-bold text-white">
                      {
                        address?.name
                      }
                    </p>

                    <p>
                      {
                        address?.address_line
                      }
                    </p>

                    <p>
                      {
                        address?.city
                      }
                      ,{" "}
                      {
                        address?.state
                      }{" "}
                      -{" "}
                      {
                        address?.pincode
                      }
                    </p>

                    <p>
                      India
                    </p>

                    <div className="pt-4 space-y-2 text-sm">
                      <p>
                        Phone:{" "}
                        {
                          address?.phone
                        }
                      </p>

                      <p>
                        Email:{" "}
                        {
                          order.users
                            ?.email
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* ORDER INFO */}

                <div className="p-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-zinc-500 text-sm">
                        Invoice No
                      </p>

                      <p className="font-bold text-lg mt-2">
                        {
                          order.order_code
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500 text-sm">
                        Date
                      </p>

                      <p className="font-bold text-lg mt-2">
                        {format(
                          new Date(
                            order.created_at
                          ),
                          "dd MMM yyyy"
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500 text-sm">
                        Payment
                      </p>

                      <div className="mt-2 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-2 rounded-xl">
                        <CreditCard className="w-4 h-4" />

                        <span className="font-semibold capitalize">
                          {
                            order.payment_method
                          }
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-zinc-500 text-sm">
                        Shipment
                      </p>

                      <div className="mt-2 inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-2 rounded-xl">
                        <Truck className="w-4 h-4" />

                        <span className="font-semibold">
                          {order.courier_name ||
                            "Development Courier"}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <p className="text-zinc-500 text-sm">
                        AWB Number
                      </p>

                      <p className="font-mono text-xl font-bold mt-2">
                        {order.awb_code ||
                          "DEV-AWB"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ITEMS */}

              <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <Package className="w-6 h-6 text-zinc-400" />

                  <h3 className="text-2xl font-black">
                    Order Items
                  </h3>
                </div>

                <div className="space-y-5">
                  {items.map(
                    (
                      item: any
                    ) => {
                      const itemTotal =
                        Number(
                          item.final_price ||
                            0
                        ) *
                        Number(
                          item.quantity ||
                            0
                        );

                      const image =
                        item.products?.product_images?.find(
                          (
                            img: any
                          ) =>
                            img.is_primary
                        )?.url ||
                        item.products
                          ?.product_images?.[0]
                          ?.url ||
                        "/placeholder.png";

                      return (
                        <div
                          key={
                            item.id
                          }
                          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex gap-5"
                        >
                          <img
                            src={
                              image
                            }
                            alt=""
                            className="w-24 h-24 rounded-xl object-cover border border-zinc-800"
                          />

                          <div className="flex-1">
                            <h4 className="font-bold text-lg">
                              {
                                item
                                  .products
                                  ?.name
                              }
                            </h4>

                            <p className="text-zinc-500 text-sm mt-2">
                              SKU:{" "}
                              {
                                item.product_id
                              }
                            </p>

                            <div className="flex flex-wrap gap-6 mt-5 text-sm">
                              <div>
                                <p className="text-zinc-500">
                                  Quantity
                                </p>

                                <p className="font-bold mt-1">
                                  {
                                    item.quantity
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-zinc-500">
                                  Unit
                                  Price
                                </p>

                                <p className="font-bold mt-1">
                                  ₹
                                  {
                                    item.final_price
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-zinc-500">
                                  Total
                                </p>

                                <p className="font-bold text-green-400 mt-1">
                                  ₹
                                  {
                                    itemTotal
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ============================= */}
          {/* RIGHT */}
          {/* ============================= */}

          <div>
            <div className="sticky top-28 bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-2xl font-black">
                  Payment
                  Summary
                </h3>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">
                    Subtotal
                  </span>

                  <span className="font-bold">
                    ₹
                    {
                      subtotal
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">
                    GST
                  </span>

                  <span className="font-bold">
                    ₹{gst}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">
                    Shipping
                  </span>

                  <span className="font-bold">
                    ₹
                    {
                      shipping
                    }
                  </span>
                </div>

                <div className="border-t border-zinc-800 pt-5 flex items-center justify-between">
                  <span className="text-2xl font-black">
                    Total
                  </span>

                  <span className="text-3xl font-black text-green-400">
                    ₹{total}
                  </span>
                </div>
              </div>

              <div className="border-t border-zinc-800 p-6">
                <a
                  href={`/api/invoice/${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-white text-black hover:bg-zinc-200 rounded-2xl py-4 font-black flex items-center justify-center gap-3 transition"
                >
                  <Download className="w-5 h-5" />

                  Download
                  Invoice PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
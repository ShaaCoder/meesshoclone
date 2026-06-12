// app/dashboard/user/returns/request/page.tsx

import { redirect } from "next/navigation";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import { createReturnRequest } from "@/app/actions/returns";

import {
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Truck,
} from "lucide-react";;
import ReturnImageUpload from "@/components/dashboard/users/returns/request/ReturnImageUpload";

export default async function ReturnRequestPage({
  searchParams,
}: {
  searchParams: Promise<{
    item?: string;
  }>;
}) {
  const { item } =
    await searchParams;

  if (!item) {
    return redirect(
      "/dashboard/user/orders"
    );
  }

  const supabase =
    await getSupabaseServer();

  /* ============================= */
  /* AUTH */
  /* ============================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  /* ============================= */
  /* FETCH ITEM */
  /* ============================= */

  const { data: orderItem } =
    await supabaseAdmin
      .from("order_items")
      .select(`
        *,
        orders (
          id,
          order_code,
          customer_id,
          status,
          created_at
        ),
        products (
          name,
          product_images (
            url,
            is_primary
          )
        )
      `)
      .eq("id", item)
      .single();

  if (!orderItem) {
    return redirect(
      "/dashboard/user/orders"
    );
  }

  /* ============================= */
  /* SECURITY */
  /* ============================= */

  if (
    orderItem.orders
      ?.customer_id !==
    user.id
  ) {
    return redirect(
      "/dashboard/user/orders"
    );
  }

  /* ============================= */
  /* EXISTING RETURN */
  /* ============================= */

  const { data: existing } =
    await supabaseAdmin
      .from("returns")
      .select("id")
      .eq(
        "order_item_id",
        orderItem.id
      )
      .single();

  if (existing) {
    return redirect(
      "/dashboard/user/returns"
    );
  }

  /* ============================= */
  /* IMAGE */
  /* ============================= */

  const image =
    orderItem.products?.product_images?.find(
      (i: any) =>
        i.is_primary
    )?.url ||
    orderItem.products
      ?.product_images?.[0]
      ?.url ||
    "/placeholder.png";

  return (
    <div className="max-w-5xl mx-auto p-6 text-black">

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8">

        {/* ============================= */}
        {/* LEFT */}
        {/* ============================= */}

        <div className="space-y-6">

          {/* PRODUCT */}

          <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">

            <div className="aspect-square bg-zinc-100 dark:bg-zinc-950">

              <img
                src={image}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6">

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 text-sm font-semibold">

                <ShieldCheck className="w-4 h-4" />

                Return Eligible
              </div>

              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mt-5 leading-tight">
                {
                  orderItem
                    .product_name
                }
              </h1>

              <div className="mt-5 space-y-3 text-sm text-zinc-500">

                <div className="flex items-center justify-between">
                  <span>
                    Order ID
                  </span>

                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {
                      orderItem
                        .orders
                        ?.order_code
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>
                    Quantity
                  </span>

                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {
                      orderItem.quantity
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>
                    Refund Amount
                  </span>

                  <span className="font-bold text-green-600 text-lg">
                    ₹
                    {Number(
                      orderItem.final_price
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* POLICY */}

          <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">

            <div className="flex items-center gap-3 mb-5">

              <AlertTriangle className="w-5 h-5 text-orange-500" />

              <h2 className="font-bold text-zinc-900 dark:text-white">
                Return Policy
              </h2>
            </div>

            <ul className="space-y-3 text-sm text-zinc-500">

              <li>
                • Product should
                be unused and in
                original condition
              </li>

              <li>
                • Refund will be
                processed after
                quality check
              </li>
<li>
  • Marketplace team
  will arrange reverse
  pickup from your
  address
</li>

<li>
  • Seller will inspect
  the returned product
  after delivery
</li>

<li>
  • Refund will be
  processed after
  successful quality
  verification
</li>

<li>
  • Refund may take
  5-7 business days
  after seller approval
</li>
            </ul>
          </div>
        </div>

        {/* ============================= */}
        {/* RIGHT */}
        {/* ============================= */}

        <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-sm p-8">

          {/* HEADER */}

          <div className="flex items-center gap-4 mb-8">

            <div className="w-16 h-16 rounded-3xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center">

              <RotateCcw className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            <div>

              <h2 className="text-3xl font-black text-zinc-900 dark:text-white">
                Return Request
              </h2>

              <p className="text-zinc-500 mt-1">
                Tell us why you
                want to return
                this item
              </p>
            </div>
          </div>

          {/* FORM */}

   <form
  action={createReturnRequest}
  className="space-y-6 text-black"
>

  <input
    type="hidden"
    name="order_item_id"
    value={
      orderItem.id
    }
  />

  <input
    type="hidden"
    name="order_id"
    value={
      orderItem.order_id
    }
  />

  {/* REASON */}

  <div>

    <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-3">

      Select Reason
    </label>

    <select
      name="reason"
      required
      className="w-full h-14 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white text-black dark:bg-zinc-950 px-5  dark:text-white outline-none focus:ring-2 focus:ring-green-500"
    >
      <option value="">
        Choose reason
      </option>

      <option value="Wrong Product" className="text-black ">
        Wrong Product
      </option>

      <option value="Damaged Product" className="text-black ">
        Damaged Product
      </option>

      <option value="Defective Product" className="text-black ">
        Defective Product
      </option>

      <option value="Quality Not Good" className="text-black ">
        Quality Not Good
      </option>

      <option value="Size Issue"  className="text-black ">
        Size Issue
      </option>

      <option value="Missing Item" className="text-black ">
        Missing Item
      </option>

      <option value="Other" className="text-black ">
        Other
      </option>
    </select>
  </div>

  {/* TYPE */}

  <div>

    <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-3">

      Choose Option
    </label>

    <div className="grid grid-cols-2 gap-4">

      <label className="border border-zinc-300 dark:border-zinc-700 rounded-2xl p-5 cursor-pointer hover:border-green-500 transition">

        <input
          type="radio"
          name="type"
          value="refund"
          defaultChecked
          className="mb-4"
        />

        <h3 className="font-bold text-zinc-900 dark:text-white">
          Refund
        </h3>

        <p className="text-sm text-zinc-500 mt-1">
          Get money back
        </p>
      </label>

      <label className="border border-zinc-300 dark:border-zinc-700 rounded-2xl p-5 cursor-pointer hover:border-green-500 transition">

        <input
          type="radio"
          name="type"
          value="replacement"
          className="mb-4"
        />

        <h3 className="font-bold text-zinc-900 dark:text-white">
          Replacement
        </h3>

        <p className="text-sm text-zinc-500 mt-1">
          Replace with new item
        </p>
      </label>
    </div>
  </div>

  {/* DESCRIPTION */}

  <div>

    <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-3">

      Describe Issue
    </label>

    <textarea
      name="description"
      rows={6}
      placeholder="Please explain the issue with the product..."
      className="w-full rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-5 py-4 text-black  outline-none focus:ring-2 focus:ring-green-500 resize-none"
    />
  </div>

  {/* IMAGE */}

  <ReturnImageUpload />

  {/* PICKUP INFO */}

  <div className="rounded-3xl bg-blue-500/10 border border-blue-500/20 p-5">

    <div className="flex items-start gap-3">

      <Truck className="w-5 h-5 text-blue-400 mt-1" />

      <div>

        <h3 className="font-bold text-zinc-900 dark:text-white">
          Reverse Pickup Process
        </h3>

        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Once approved, our logistics partner will
          pick up the product from your address
          and return it to the seller for inspection.
        </p>

        <p className="text-xs text-zinc-500 mt-3">
          Reverse logistics updates are synced automatically.
        </p>
      </div>
    </div>
  </div>

  {/* SUBMIT */}

  <button
    type="submit"
    className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 transition text-white font-bold text-lg flex items-center justify-center gap-3"
  >

    <RotateCcw className="w-5 h-5" />

    Submit Return Request
  </button>
</form>
        </div>
      </div>
    </div>
  );
}
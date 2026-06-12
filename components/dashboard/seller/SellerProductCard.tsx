
import Link from "next/link";

import {
  Eye,
  Pencil,
  Layers3,
  IndianRupee,
  Boxes,
} from "lucide-react";

export default function SellerProductCard({
  product,
}: any) {

  /* ============================= */
  /* 🖼 IMAGE */
  /* ============================= */

  const image =
    product?.product_images?.find(
      (img: any) => img?.is_primary
    )?.url ||
    product?.product_images?.[0]
      ?.url ||
    "/placeholder.png";

  /* ============================= */
  /* 📦 VARIANTS */
  /* ============================= */

  const variants =
    Array.isArray(
      product?.product_variants
    )
      ? product.product_variants
      : [];

  const totalVariants =
    variants.length;

  /* ============================= */
  /* 📦 STOCK */
  /* ============================= */

  const totalStock =
    variants.reduce(
      (
        total: number,
        variant: any
      ) =>
        total +
        Number(
          variant?.stock || 0
        ),
      0
    );

  /* ============================= */
  /* 💰 SELLING PRICE */
  /* ============================= */

  const sellingPrices =
    variants
      .map((v: any) => {

        const sellingPrice =
          Number(
            v?.selling_price || 0
          );

        /* ✅ fallback pricing engine */
        if (sellingPrice > 0) {
          return sellingPrice;
        }

        return (
          Number(
            v?.cost_price || 0
          ) +
          Number(
            v?.platform_margin || 0
          )
        );

      })
      .filter(
        (price: number) =>
          price > 0
      );

  const minPrice =
    sellingPrices.length
      ? Math.min(
          ...sellingPrices
        )
      : 0;

  const maxPrice =
    sellingPrices.length
      ? Math.max(
          ...sellingPrices
        )
      : 0;

  /* ============================= */
  /* 💵 PROFIT */
  /* ============================= */

  const totalProfit =
    variants.reduce(
      (
        total: number,
        variant: any
      ) => {

        let profit =
          Number(
            variant?.seller_profit || 0
          );

        /* ✅ fallback */
        if (profit <= 0) {
          profit =
            Number(
              variant?.selling_price || 0
            ) -
            Number(
              variant?.cost_price || 0
            );
        }

        const stock =
          Number(
            variant?.stock || 0
          );

        return (
          total +
          (profit * stock)
        );

      },
      0
    );

  /* ============================= */
  /* ✅ STATUS */
  /* ============================= */

  const approvalStatus =
    product?.approval_status ||
    "pending";

  const isApproved =
    approvalStatus ===
    "approved";

  return (
    <div className="group relative overflow-hidden rounded-[32px] border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black hover:border-zinc-700 transition-all duration-300">

      {/* ============================= */}
      {/* 🖼 IMAGE */}
      {/* ============================= */}

      <div className="relative aspect-square overflow-hidden bg-zinc-900">

        <img
          src={image}
          alt={
            product?.name ||
            "Product"
          }
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />

        {/* STATUS */}

        <div className="absolute top-4 left-4">

          <div
            className={`backdrop-blur-xl text-xs font-semibold px-3 py-1.5 rounded-full border ${
              isApproved
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
            }`}
          >
            {approvalStatus.toUpperCase()}
          </div>
        </div>

        {/* STOCK */}

        <div className="absolute top-4 right-4">

          <div className="bg-black/60 backdrop-blur-xl border border-zinc-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            {totalStock} Stock
          </div>
        </div>
      </div>

      {/* ============================= */}
      {/* 📄 CONTENT */}
      {/* ============================= */}

      <div className="p-5 space-y-5">

        {/* TITLE */}

        <div>
          <h3 className="text-lg font-bold text-white line-clamp-2">
            {product?.name}
          </h3>

          <div className="flex items-center gap-2 mt-2 text-zinc-500 text-sm">

            <span>
              ID:
              {" "}
              {product?.id?.slice(
                0,
                8
              )}
            </span>

            {!!product?.categories
              ?.name && (
              <>
                <span>
                  •
                </span>

                <span>
                  {
                    product
                      ?.categories
                      ?.name
                  }
                </span>
              </>
            )}
          </div>
        </div>

        {/* ============================= */}
        {/* 💰 PRICE CARDS */}
        {/* ============================= */}

        <div className="grid grid-cols-2 gap-3">

          {/* PRICE */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">

            <div className="flex items-center gap-2 text-zinc-400 text-xs">

              <IndianRupee className="w-3 h-3" />

              Selling Price
            </div>

            <p className="text-blue-400 font-bold mt-2 text-lg">

              {minPrice <= 0
                ? "N/A"
                : minPrice ===
                  maxPrice
                ? `₹${minPrice}`
                : `₹${minPrice} - ₹${maxPrice}`}
            </p>
          </div>

          {/* PROFIT */}

          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3">

            <div className="flex items-center gap-2 text-green-400 text-xs">

              <IndianRupee className="w-3 h-3" />

              Inventory Profit
            </div>

            <p className="text-green-400 font-bold mt-2 text-lg">
              ₹
              {totalProfit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* ============================= */}
        {/* 📊 STATS */}
        {/* ============================= */}

        <div className="grid grid-cols-2 gap-3">

          {/* VARIANTS */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-3">

            <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center">

              <Layers3 className="w-5 h-5 text-white" />
            </div>

            <div>
              <p className="text-zinc-500 text-xs">
                Variants
              </p>

              <p className="text-white font-bold">
                {totalVariants}
              </p>
            </div>
          </div>

          {/* STOCK */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-3">

            <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center">

              <Boxes className="w-5 h-5 text-white" />
            </div>

            <div>
              <p className="text-zinc-500 text-xs">
                Total Stock
              </p>

              <p className="text-white font-bold">
                {totalStock}
              </p>
            </div>
          </div>
        </div>

        {/* ============================= */}
        {/* ⚡ ATTRIBUTES */}
        {/* ============================= */}

        {!!variants?.[0]
          ?.attributes && (
          <div className="flex flex-wrap gap-2">

            {Object.entries(
              variants[0]
                .attributes
            )
              .slice(0, 3)
              .map(
                ([
                  key,
                  value,
                ]) => (
                  <div
                    key={key}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-full"
                  >
                    <span className="capitalize">
                      {key}
                    </span>
                    :
                    {" "}
                    {String(
                      value
                    )}
                  </div>
                )
              )}
          </div>
        )}

        {/* ============================= */}
        {/* 🚀 ACTIONS */}
        {/* ============================= */}

        <div className="flex items-center gap-3">

          {/* VIEW */}

          <Link
            href={`/product/${product?.slug}`}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 transition rounded-2xl py-3 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white"
          >

            <Eye className="w-4 h-4" />

            View
          </Link>

          {/* EDIT */}

          <Link
            href={`/dashboard/seller/products/${product?.id}`}
            className="flex-1 bg-white text-black hover:bg-zinc-200 transition rounded-2xl py-3 inline-flex items-center justify-center gap-2 text-sm font-semibold"
          >

            <Pencil className="w-4 h-4" />

            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}

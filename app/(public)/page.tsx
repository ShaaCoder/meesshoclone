"use client";

import { motion, Variants } from "framer-motion";
import { useProducts } from "@/hooks/useProducts";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import ProductSkeleton from "@/components/ProductSkeleton";
import { Star, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ============================= */
/* 🎬 ANIMATION */
/* ============================= */

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  const { products, loading } = useProducts();

  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [heroIndex, setHeroIndex] = useState(0);

  /* ============================= */
  /* 📂 FETCH CATEGORIES */
  /* ============================= */
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("categories").select("*");
      if (data) {
        setCategories([{ id: "all", name: "All" }, ...data]);
      }
    };
    fetch();
  }, []);

  /* ============================= */
  /* 🔥 FILTER PRODUCTS */
  /* ============================= */
  const filtered =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.category_id === activeCategory);

  const heroProduct = filtered[heroIndex] || filtered[0];

  /* ============================= */
  /* 🔁 HERO ROTATION */
  /* ============================= */
  useEffect(() => {
    if (!filtered.length) return;

    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % filtered.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [filtered]);

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative min-h-[80vh] flex items-center bg-gradient-to-br from-violet-50 to-rose-50">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">

          {/* LEFT */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium">New Collection</span>
            </div>

            <h1 className="text-5xl font-bold">
              Discover Your <br />
              <span className="text-violet-600">Perfect Style</span>
            </h1>

            <button
              onClick={() =>
                document
                  .getElementById("products")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="bg-black text-white px-6 py-3 rounded-xl flex items-center gap-2"
            >
              Explore <ArrowRight size={18} />
            </button>
          </div>

          {/* RIGHT */}
          {heroProduct && (
            <div className="relative h-[400px]">
              <Image
                src={heroProduct.image}
                alt={heroProduct.name}
                fill
                className="object-cover rounded-2xl"
              />

              {/* 🔥 SAFE PRICE DISPLAY */}
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-lg font-semibold">
                  {heroProduct.name}
                </p>

                <p className="text-xl">
                  {heroProduct.minPrice
                    ? heroProduct.maxPrice &&
                      heroProduct.maxPrice !== heroProduct.minPrice
                      ? `₹${heroProduct.minPrice} - ₹${heroProduct.maxPrice}`
                      : `₹${heroProduct.minPrice}`
                    : "No price"}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= CATEGORY ================= */}
      <div className="sticky top-0 bg-white border-b z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex gap-3 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCategory(c.id);
                setHeroIndex(0);
              }}
              className={`px-5 py-2 rounded-xl ${
                activeCategory === c.id
                  ? "bg-black text-white"
                  : "border"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ================= PRODUCTS ================= */}
      <section id="products" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">

          {/* HEADER */}
          <div className="flex justify-between mb-10">
            <h2 className="text-3xl font-bold">
              {categories.find((c) => c.id === activeCategory)?.name || "All"} Collection
            </h2>
            <span className="text-gray-500">
              {filtered.length} products
            </span>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          )}

          {/* PRODUCTS */}
          {!loading && (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {filtered.map((p) => {
                const price = p.minPrice || 0;
                const max = p.maxPrice || 0;

                const mrp = price ? Math.round(price * 1.3) : 0;
                const discount =
                  price > 0 && mrp > price
                    ? Math.round(((mrp - price) / mrp) * 100)
                    : 0;

                return (
                  <motion.div key={p.id} variants={item}>
                    <Link href={`/product/${p.slug}`}>
                      <div className="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition">

                        {/* IMAGE */}
                        <div className="relative h-48">
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-cover"
                          />

                          {discount > 10 && (
                            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                              {discount}% OFF
                            </div>
                          )}
                        </div>

                        {/* INFO */}
                        <div className="p-4">
                          <p className="font-medium line-clamp-2">
                            {p.name}
                          </p>

                          {/* 🔥 SAFE PRICE */}
                          <div className="mt-2">
                            <span className="text-lg font-bold">
                              {price
                                ? max && max !== price
                                  ? `₹${price} - ₹${max}`
                                  : `₹${price}`
                                : "No price"}
                            </span>
                          </div>

                          <div className="flex justify-between mt-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Star size={14} /> 4.5
                            </span>
                            <span>Free Delivery</span>
                          </div>
                        </div>

                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>
    </>
  );
}
"use client";

import { motion , Variants  } from "framer-motion";
import { useProducts } from "@/hooks/useProducts";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import ProductSkeleton from "@/components/ProductSkeleton";
import { Heart, Star } from "lucide-react";

/* ============================= */
/* 🎬 ANIMATIONS */
/* ============================= */

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};


export default function Home() {
  const products = useProducts();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    if (products) setLoading(false);
  }, [products]);

  if (loading) return <ProductSkeleton />;

  const featured = products?.slice(0, 6) || [];

  const categories = [
    "All",
    "Women",
    "Men",
    "Electronics",
    "Home & Living",
    "Shoes",
    "Beauty",
  ];

  return (
    <>
      {/* ================= PREMIUM BLUE HERO ================= */}
      <section className="relative min-h-[100dvh] flex items-center bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 overflow-hidden">
        
        {/* Background Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(at_40%_20%,rgba(59,130,246,0.25)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(at_70%_70%,rgba(147,51,234,0.20)_0%,transparent_70%)]" />

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium tracking-widest text-white">NEW SEASON COLLECTION</span>
              </div>

              <h1 className="text-6xl md:text-7xl font-bold leading-none tracking-tighter text-white">
                Elevate Your <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Style Game
                </span>
              </h1>

              <p className="text-xl text-blue-100/90 max-w-md">
                Discover premium products curated for those who appreciate quality and elegance.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-white hover:bg-blue-50 text-black px-8 py-4 rounded-2xl font-semibold transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-blue-500/20"
                >
                  Shop Premium Collection
                  <span>→</span>
                </button>

                <button className="border border-white/30 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-medium transition-all">
                  Watch Video
                </button>
              </div>

              <div className="flex gap-8 text-sm text-blue-200/80 pt-4">
                <div>Free Shipping</div>
                <div>30-Day Returns</div>
                <div>Secure Checkout</div>
              </div>
            </div>

            {/* Right Visual - Large Shopping Bags */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative scale-110">
                {/* Main Blue Bag */}
                <div className="text-[380px] drop-shadow-2xl">🛍️</div>
                
                {/* Floating Orange Bag */}
                <div className="absolute -bottom-12 -right-12 text-[180px] rotate-12 drop-shadow-xl">
                  🛒
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= TRENDING NOW - LARGER SIZE ================= */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6">
          <p className="text-xs tracking-[4px] text-blue-300/70 mb-4 text-center font-medium">
            TRENDING NOW
          </p>
          
          <div className="flex gap-6 justify-center overflow-x-auto no-scrollbar pb-4">
            {featured.slice(0, 5).map((p: any) => (
              <Link 
                key={p.id} 
                href={`/product/${p.slug}`}
                className="group flex-shrink-0"
              >
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 shadow-xl">
                  <Image
                    src={p.image || "/placeholder.png"}
                    alt={p.name}
                    width={140}
                    height={140}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CATEGORY PILLS ================= */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="sticky top-[73px] z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-2xl hover:border-zinc-400 transition">
              Sort by ↓
            </button>
            <button className="px-5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-2xl hover:border-zinc-400 transition">
              Price Range
            </button>
            <button className="px-5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-2xl hover:border-zinc-400 transition">
              Rating
            </button>
          </div>

          <div className="text-sm text-zinc-500">
            {products?.length || 0} premium products
          </div>
        </div>
      </div>

      {/* ================= PRODUCTS GRID ================= */}
      <section id="products" className="bg-zinc-50 dark:bg-black py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-4xl font-bold tracking-tight">Our Collection</h2>
              <p className="text-zinc-500 mt-2">Handpicked premium products</p>
            </div>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
          >
            {products.map((p: any) => {
              const price = Number(p.selling_price || p.base_price || 0);
              const mrp = Math.round(price * 1.35);
              const discount = Math.round(((mrp - price) / mrp) * 100);

              return (
                <motion.div key={p.id} variants={item} className="group">
                  <Link href={`/product/${p.slug}`}>
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2 border border-zinc-100 dark:border-zinc-800">
                      <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                        <Image
                          src={p.image || "/placeholder.png"}
                          alt={p.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />

                        {discount > 8 && (
                          <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-xl">
                            -{discount}%
                          </div>
                        )}

                        <button className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-white">
                          <Heart className="w-4 h-4 text-zinc-700" />
                        </button>
                      </div>

                      <div className="p-5">
                        <h3 className="font-medium line-clamp-2 text-sm leading-tight mb-3 group-hover:text-blue-600 transition">
                          {p.name}
                        </h3>

                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-semibold">₹{price}</span>
                          <span className="text-sm text-zinc-400 line-through">₹{mrp}</span>
                        </div>

                        <div className="flex items-center justify-between mt-4 text-xs">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span>4.8</span>
                          </div>
                          <div className="text-emerald-600 font-medium">Free Delivery</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
    </>
  );
}
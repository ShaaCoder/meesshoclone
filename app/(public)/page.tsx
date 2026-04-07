"use client";
import { motion, Variants } from "framer-motion";
import { useProducts } from "@/hooks/useProducts";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import ProductSkeleton from "@/components/ProductSkeleton";
import { Heart, Star, ShoppingCart, Sparkles } from "lucide-react";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function Home() {
  const products = useProducts();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  // Rotate hero image every 4 seconds
  useEffect(() => {
    if (!products || products.length === 0) return;

    const interval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % products.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [products]);

  useEffect(() => {
    if (products) setLoading(false);
  }, [products]);

  if (loading) return <ProductSkeleton />;

  const categories = [
    "All", "Women", "Men", "Electronics", "Home & Living", "Shoes", "Beauty",
  ];

  const heroProduct = products?.[heroImageIndex] || products?.[0];

  return (
    <>
      {/* ================= BRIGHT HERO SECTION ================= */}
      <section className="relative min-h-dvh flex items-center overflow-hidden bg-linear-to-br from-violet-100 via-sky-100 to-pink-100">
        {/* Background Decorations */}
        <div className="absolute inset-0 bg-[radial-gradient(at_top_right,#c026d310_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(at_bottom_left,#3b82f610_0%,transparent_60%)]" />

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-5 py-2 bg-white rounded-full shadow-sm border border-white">
                <Sparkles className="w-5 h-5 text-violet-500" />
                <span className="text-sm font-semibold text-violet-700">New Season 2026</span>
              </div>

              <h1 className="text-6xl lg:text-7xl font-bold leading-tight tracking-tighter text-zinc-900">
                Elevate Your<br />
                <span className="bg-linear-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
                  Everyday Style
                </span>
              </h1>

              <p className="text-xl text-zinc-600 max-w-md">
                Discover premium, handpicked products that blend comfort with elegance.
              </p>

              <button
                onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
                className="group bg-zinc-900 hover:bg-black text-white px-9 py-4 rounded-2xl font-semibold text-lg flex items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-zinc-300"
              >
                Shop Now
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            {/* Rotating Hero Product Image */}
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-zinc-300/50 bg-white">
                {heroProduct && (
                  <>
                    <Image
                      key={heroImageIndex}
                      src={heroProduct.image || "/placeholder.png"}
                      alt={heroProduct.name || "Product"}
                      fill
                      className="object-cover transition-all duration-700 ease-out"
                      priority
                    />

                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />

                    <div className="absolute bottom-8 left-8 right-8 text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                          Featured
                        </span>
                      </div>
                      <h3 className="text-2xl font-semibold line-clamp-2 mb-1">
                        {heroProduct.name}
                      </h3>
                      <p className="text-lg font-medium">
                        ₹{Number(heroProduct.selling_price ?? heroProduct.price ?? 0)}
                      </p>
                    </div>

                    {/* Discount Badge */}
                    {(() => {
                      const price = Number(heroProduct.selling_price ?? heroProduct.price ?? 0);
                      const mrp = Math.round(price * 1.35);
                      const discount = price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
                      return discount > 15 ? (
                        <div className="absolute top-8 right-8 bg-rose-500 text-white text-sm font-bold px-4 py-2 rounded-2xl shadow-lg">
                          -{discount}% OFF
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>

              {/* Dots Indicator */}
              <div className="flex justify-center gap-2 mt-6">
                {products?.slice(0, 5).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHeroImageIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === heroImageIndex ? "bg-violet-600 scale-125" : "bg-zinc-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-500">
          <span className="text-xs tracking-widest font-medium">SCROLL TO DISCOVER</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-xl"
          >
            ↓
          </motion.div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-7 py-3 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  activeCategory === cat
                    ? "bg-zinc-900 text-white shadow-md"
                    : "bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= PRODUCTS SECTION ================= */}
      <section id="products" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-zinc-900">Our Collection</h2>
              <p className="text-zinc-500 mt-2 text-lg">Premium picks for you</p>
            </div>
            <div className="text-zinc-400 text-sm">
              {products?.length || 0} products
            </div>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8"
          >
            {products?.map((p: any) => {
              const price = Number(p.selling_price ?? p.price ?? 0);
              const mrp = Math.round(price * 1.35);
              const discount = price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

              return (
                <motion.div
                  key={p.id}
                  variants={item}
                  whileHover={{ y: -10 }}
                  className="group"
                >
                  <Link href={`/product/${p.slug}`}>
                    <div className="bg-white rounded-3xl overflow-hidden border border-zinc-100 hover:border-zinc-200 transition-all duration-500 hover:shadow-xl">
                      <div className="relative aspect-[4/4.2] bg-zinc-100 overflow-hidden rounded-t-3xl">
                        <Image
                          src={p.image || "/placeholder.png"}
                          alt={p.name || "Product"}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        {discount > 15 && (
                          <div className="absolute top-4 left-4 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                            -{discount}%
                          </div>
                        )}
                        <button className="absolute top-4 right-4 p-3 bg-white rounded-2xl shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                          <Heart className="w-5 h-5 text-zinc-700" />
                        </button>
                      </div>

                      <div className="p-6">
                        <h3 className="font-medium text-base line-clamp-2 min-h-[2.8rem] group-hover:text-violet-600 transition-colors">
                          {p.name}
                        </h3>
                        <div className="flex items-baseline gap-3 mt-4">
                          <span className="text-2xl font-semibold text-zinc-900">₹{price}</span>
                          <span className="text-sm text-zinc-400 line-through">₹{mrp}</span>
                        </div>
                        <div className="flex justify-between items-center mt-5 text-sm">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-medium">4.8</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                            <ShoppingCart className="w-4 h-4" />
                            Free Delivery
                          </div>
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
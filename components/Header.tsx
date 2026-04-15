"use client";

import Link from "next/link";
import { ShoppingCart, User, Search, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useSearchContext } from "@/context/SearchContext";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
const [categories, setCategories] = useState<any[]>([]);
  const { query, setQuery } = useSearchContext();
  const debouncedQuery = useDebounce(query, 300);

  const router = useRouter();

  /* ================= USER ================= */
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        fetchWishlistCount(user.id);
        subscribeWishlist(user.id);
      }
    };

    getUser();
  }, []);
  /* ================= CATEGORIES ================= */
useEffect(() => {
  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    if (data) setCategories(data);
  };

  fetchCategories();
}, []);

  /* ================= FETCH COUNT ================= */
  const fetchWishlistCount = async (userId: string) => {
    const { count } = await supabase
      .from("wishlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    setWishlistCount(count || 0);
  };

  /* ================= REALTIME ================= */
  const subscribeWishlist = (userId: string) => {
    supabase
      .channel("wishlist-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wishlists",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchWishlistCount(userId); // 🔥 auto update
        }
      )
      .subscribe();
  };

  /* ================= SEARCH ================= */
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);

      const { data } = await supabase
        .from("products")
        .select("id, name, slug, image, selling_price")
        .ilike("name", `%${debouncedQuery}%`)
        .limit(5);

      if (data) setResults(data);

      setLoading(false);
    };

    fetchProducts();
  }, [debouncedQuery]);

  const handleSearch = () => {
    if (!query.trim()) return;
    setShowDropdown(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <>
    <>
  <header className="bg-white border-b sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      
      {/* LOGO */}
      <Link href="/" className="text-xl font-bold text-blue-600">
        ShopSphere
      </Link>

      {/* SEARCH */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

        <input
          type="text"
          value={query}
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search products..."
          className="w-full pl-10 pr-20 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <button
          onClick={handleSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
        >
          Search
        </button>

        {/* DROPDOWN */}
        {showDropdown && (
          <div className="absolute top-full mt-2 w-full bg-white border rounded-xl shadow-lg z-50">
            {loading && (
              <div className="p-3 text-sm text-gray-500">Searching...</div>
            )}

            {!loading && results.length > 0 && (
              <>
                {results.map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug}`}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100"
                  >
                    <img
                      src={p.image || "/placeholder.png"}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="text-sm">
                      <p className="line-clamp-1">{p.name}</p>
                      <p className="text-gray-500 text-xs">
                        ₹{p.selling_price}
                      </p>
                    </div>
                  </Link>
                ))}
              </>
            )}

            {!loading && results.length === 0 && debouncedQuery && (
              <div className="p-3 text-sm text-gray-500">
                No products found 😢
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-5">
        <Link href="/wishlist" className="relative">
          <Heart className="w-6 h-6 text-gray-700" />
          {wishlistCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {wishlistCount}
            </span>
          )}
        </Link>

        <Link href="/cart">
          <ShoppingCart className="w-6 h-6 text-gray-700" />
        </Link>

        {user ? (
          <Link href="/dashboard/user" className="flex gap-2 items-center">
            <User className="w-6 h-6 text-gray-700" />
            <span className="hidden md:block">Account</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Login
          </Link>
        )}
      </div>
    </div>
  </header>

  {/* 🔥 CATEGORY BAR */}
  <div className="bg-white border-b">
    <div className="max-w-7xl mx-auto px-4 py-2 flex gap-6 overflow-x-auto scrollbar-hide">

      {/* ALL */}
      <Link
        href="/categories"
        className="text-sm font-medium whitespace-nowrap hover:text-blue-600"
      >
        All
      </Link>

      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/category/${cat.slug}`}
          className="text-sm font-medium whitespace-nowrap hover:text-blue-600"
        >
          {cat.name}
        </Link>
      ))}
    </div>
  </div>
</>
    </>
  
  );
}
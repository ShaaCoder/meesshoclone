"use client";

import Link from "next/link";
import { ShoppingCart, User, Search } from "lucide-react";
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
    };

    getUser();
  }, []);

  /* ================= BACKEND SEARCH ================= */
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, image, selling_price")
        .ilike("name", `%${debouncedQuery}%`)
        .limit(5);

      if (!error && data) {
        setResults(data);
      }

      setLoading(false);
    };

    fetchProducts();
  }, [debouncedQuery]);

  /* ================= SEARCH ACTION ================= */
  const handleSearch = () => {
    if (!query.trim()) return;
    setShowDropdown(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
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
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Search products..."
            className="w-full pl-10 pr-20 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* SEARCH BUTTON */}
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
          >
            Search
          </button>

          {/* 🔥 DROPDOWN */}
          {showDropdown && (
            <div className="absolute top-full mt-2 w-full bg-white border rounded-xl shadow-lg z-50">

              {/* LOADING */}
              {loading && (
                <div className="p-3 text-sm text-gray-500">
                  Searching...
                </div>
              )}

              {/* RESULTS */}
              {!loading && results.length > 0 && (
                <>
                  {results.map((p: any) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-100 transition"
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

                  {/* VIEW ALL */}
                  <button
                    onClick={handleSearch}
                    className="w-full text-center text-blue-600 py-2 text-sm hover:bg-gray-50"
                  >
                    View all results →
                  </button>
                </>
              )}

              {/* NO RESULTS */}
              {!loading && results.length === 0 && debouncedQuery && (
                <div className="p-3 text-sm text-gray-500">
                  No products found 😢
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          <Link href="/cart">
            <ShoppingCart className="w-6 h-6 text-gray-700" />
          </Link>

          {user ? (
            <Link href="/dashboard/user" className="flex gap-2">
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
  );
}
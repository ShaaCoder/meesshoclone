"use client";

import Link from "next/link";
import { ShoppingCart, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    };

    getUser();
  }, []);

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* 🔥 LOGO */}
        <Link href="/" className="text-xl font-bold">
          ShopSphere
        </Link>

        {/* 🔍 SEARCH */}
        <input
          placeholder="Search products..."
          className="hidden md:block border px-4 py-2 rounded-lg w-1/3"
        />

        {/* 🧠 RIGHT SIDE */}
        <div className="flex items-center gap-4">

          {/* 🛒 CART */}
          <Link href="/cart" className="relative">
            <ShoppingCart className="w-6 h-6" />
          </Link>

          {/* 👤 USER */}
          {user ? (
            <Link
              href="/dashboard/user"
              className="flex items-center gap-2"
            >
              <User className="w-6 h-6" />
              <span className="hidden md:block">Account</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-black text-white px-4 py-2 rounded-lg"
            >
              Login
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
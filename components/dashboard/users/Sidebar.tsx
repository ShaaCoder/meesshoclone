"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Package,
  User,
  MapPin,
  Heart,
  LogOut,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase"; // ✅ correct import
import { useState } from "react";

const navItems = [
  {
    label: "My Orders",
    href: "/dashboard/user",
    icon: Package,
  },
  {
    label: "Profile",
    href: "/dashboard/user/profile",
    icon: User,
  },
  {
    label: "Addresses",
    href: "/dashboard/user/addresses",
    icon: MapPin,
  },
  {
    label: "Wishlist",
    href: "/dashboard/user/wishlist",
    icon: Heart,
  },
  {
    label: "Invoices",
    href: "/dashboard/user/invoices",
    icon: Heart,
  },
  {
    label: "Shop",
    href: "/",
    icon: ShoppingBag,
  },
  
];

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 🔥 LOGOUT FUNCTION
  const handleLogout = async () => {
    try {
      setLoading(true);

      await supabase.auth.signOut(); // ✅ clear session

      router.replace("/login"); // ✅ redirect cleanly
      router.refresh(); // ✅ update server state
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
      
      {/* 🔷 Logo */}
      <div className="p-8 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black dark:bg-white rounded-xl flex items-center justify-center">
            <span className="text-white dark:text-black font-bold text-lg">
              S
            </span>
          </div>
          <div>
            <p className="font-semibold text-lg tracking-tight">
              ShopSphere
            </p>
            <p className="text-xs text-zinc-500 -mt-1">
              E-commerce
            </p>
          </div>
        </div>
      </div>

      {/* 🔷 Navigation */}
      <nav className="flex-1 p-6">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 🔷 User Info + Logout */}
      <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
        
        {/* User Info */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden flex-shrink-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <p className="font-semibold text-sm truncate">
              {user?.full_name || "Customer"}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              Member since 2025
            </p>
          </div>
        </div>

        {/* 🔥 Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl transition disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          {loading ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
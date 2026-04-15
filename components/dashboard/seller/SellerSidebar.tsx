"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Wallet,
  User,
  FileText,
  LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const links = [
  { href: "/dashboard/seller", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/seller/products", label: "Products", icon: Package },
  { href: "/dashboard/seller/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/seller/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/seller/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/seller/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/seller/profile", label: "Profile", icon: User },
];

export default function SellerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setLoading(false);
    };

    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Extract name
  const fullName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Seller";

  const email = user?.email || "";

  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="w-72 bg-zinc-950 border-r border-zinc-800 h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Seller<span className="text-emerald-500">.</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Business Hub</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive
                    ? "text-white"
                    : "text-zinc-500 group-hover:text-zinc-400"
                }`}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-zinc-800 mt-auto">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white">
            {loading ? "..." : initials}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {loading ? "Loading..." : fullName}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              {loading ? "" : email}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full mt-3 px-4 py-3 text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
// components/dashboard/seller/SellerSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
} from "lucide-react";

const links = [
  { href: "/dashboard/seller", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/seller/products", label: "Products", icon: Package },
  { href: "/dashboard/seller/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/seller/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/seller/wallet", label: "Wallet", icon: BarChart3 },
  { href: "/dashboard/seller/profile", label: "profile", icon: BarChart3 },
];

export default function SellerSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-black text-white p-6 flex flex-col">
      <h2 className="text-2xl font-bold mb-10">Seller Panel</h2>

      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 p-3 rounded-lg transition ${
                active
                  ? "bg-white text-black"
                  : "hover:bg-gray-800"
              }`}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
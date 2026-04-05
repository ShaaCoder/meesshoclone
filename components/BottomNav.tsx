"use client";

import Link from "next/link";
import { Home, ShoppingCart, User, Heart } from "lucide-react";

export default function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 md:hidden z-50">

      <Link href="/" className="flex flex-col items-center text-xs">
        <Home size={20} />
        Home
      </Link>

      <Link href="/wishlist" className="flex flex-col items-center text-xs">
        <Heart size={20} />
        Wishlist
      </Link>

      <Link href="/cart" className="flex flex-col items-center text-xs">
        <ShoppingCart size={20} />
        Cart
      </Link>

      <Link href="/dashboard/user" className="flex flex-col items-center text-xs">
        <User size={20} />
        Account
      </Link>

    </div>
  );
}
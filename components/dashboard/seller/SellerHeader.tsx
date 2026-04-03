// components/dashboard/seller/SellerHeader.tsx
"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SellerHeader() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex justify-between text-blackitems-center bg-white px-6 py-4 shadow">
      <h1 className="text-xl text-black font-semibold">Seller Dashboard</h1>

      <button
        onClick={handleLogout}
        className="bg-black text-white px-4 py-2 rounded-lg"
      >
        Logout
      </button>
    </div>
  );
}
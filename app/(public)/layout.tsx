"use client";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { SearchProvider } from "@/context/SearchContext";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SearchProvider>
      <div className="flex flex-col min-h-screen bg-white text-gray-900">

        {/* 🔥 HEADER */}
        <Header />

        {/* MAIN */}
        <main className="flex-1 bg-white">
          {children}
        </main>

        {/* BOTTOM NAV */}
        <BottomNav />

        {/* FOOTER */}
        <Footer />
      </div>
    </SearchProvider>
  );
}
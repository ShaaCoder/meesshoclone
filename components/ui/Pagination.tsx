"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  className = "",
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between mt-10 ${className}`}>
      <div className="text-sm text-zinc-400">
        Page <span className="font-medium text-white">{currentPage}</span> of{" "}
        <span className="font-medium text-white">{totalPages}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <Link
          href={createPageURL(currentPage - 1)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
            ${
              currentPage > 1
                ? "bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700"
                : "bg-zinc-900/50 text-zinc-600 cursor-not-allowed pointer-events-none"
            }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Link>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              // Show first page, last page, current page, and pages around current
              return (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 2 && page <= currentPage + 2)
              );
            })
            .map((page, index, array) => {
              const showDots = index > 0 && array[index - 1] !== page - 1;

              return (
                <div key={page} className="flex items-center">
                  {showDots && (
                    <span className="px-3 text-zinc-500">...</span>
                  )}
                  <Link
                    href={createPageURL(page)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all
                      ${
                        page === currentPage
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                          : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700"
                      }`}
                  >
                    {page}
                  </Link>
                </div>
              );
            })}
        </div>

        {/* Next Button */}
        <Link
          href={createPageURL(currentPage + 1)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
            ${
              currentPage < totalPages
                ? "bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700"
                : "bg-zinc-900/50 text-zinc-600 cursor-not-allowed pointer-events-none"
            }`}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
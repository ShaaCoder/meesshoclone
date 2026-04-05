"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function ReviewsList({ reviews }: any) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  /* ============================= */
  /* ❌ CLOSE ON ESC */
  /* ============================= */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedImage(null);
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  if (!reviews?.length) return <p>No reviews yet.</p>;

  return (
    <>
      <div className="space-y-4">
        {reviews.map((r: any) => (
          <div key={r.id} className="border rounded-xl p-4">

            {/* 👤 USER */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">
                {r.users?.name || "User"}
              </span>

              <span className="text-yellow-500 font-medium">
                ⭐ {r.rating}
              </span>
            </div>

            {/* 💬 COMMENT */}
            <p className="text-sm text-gray-600 mt-2">
              {r.comment}
            </p>

            {/* 📸 IMAGES */}
            {r.images?.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {r.images.map((img: string, i: number) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 cursor-pointer"
                    onClick={() => setSelectedImage(img)}
                  >
                    <Image
                      src={img}
                      alt="review"
                      fill
                      className="object-cover rounded-lg hover:scale-105 transition"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 🔥 FULLSCREEN IMAGE VIEWER */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl w-full px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              className="w-full max-h-[90vh] object-contain rounded-xl"
            />

            {/* ❌ CLOSE BUTTON */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white text-black px-3 py-1 rounded-full shadow"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
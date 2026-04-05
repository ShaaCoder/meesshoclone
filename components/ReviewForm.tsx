"use client";

import { useState } from "react";
import { addReview } from "@/app/actions/review";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";

export default function ReviewForm({ productId }: any) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  /* ============================= */
  /* 📸 HANDLE FILE SELECT */
  /* ============================= */

  const handleFileChange = (e: any) => {
    const selectedFiles = e.target.files;
    setFiles(selectedFiles);

    if (selectedFiles) {
      const previews = Array.from(selectedFiles).map((file: any) =>
        URL.createObjectURL(file)
      );
      setPreviewUrls(previews);
    }
  };

  /* ============================= */
  /* 🚀 SUBMIT */
  /* ============================= */

  const handleSubmit = async (formData: FormData) => {
    try {
      setLoading(true);

      let imageUrls: string[] = [];

      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          /* 🔥 COMPRESS IMAGE */
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.3, // ~300KB
            maxWidthOrHeight: 1024,
            useWebWorker: true,
          });

          const fileName = `review-${Date.now()}-${i}.jpg`;

          const { error } = await supabase.storage
            .from("review-images")
            .upload(fileName, compressedFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (error) {
            console.error("Upload error:", error);
            continue;
          }

          const { data } = supabase.storage
            .from("review-images")
            .getPublicUrl(fileName);

          if (data?.publicUrl) {
            imageUrls.push(data.publicUrl);
          }
        }
      }

      /* 📦 ADD TO FORM */
      formData.append("images", JSON.stringify(imageUrls));

      await addReview(formData);

      /* 🔄 RESET */
      setComment("");
      setRating(5);
      setFiles(null);
      setPreviewUrls([]);

      window.location.reload();
    } catch (err) {
      console.error("Review submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ============================= */
  /* 🧾 UI */
  /* ============================= */

  return (
    <form action={handleSubmit} className="space-y-4">

      <input type="hidden" name="product_id" value={productId} />

      {/* ⭐ RATING */}
      <div>
        <label className="text-sm font-medium">Rating</label>
        <select
          name="rating"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="border px-3 py-2 rounded w-full"
        >
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} ⭐
            </option>
          ))}
        </select>
      </div>

      {/* 💬 COMMENT */}
      <div>
        <label className="text-sm font-medium">Review</label>
        <textarea
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="border px-3 py-2 rounded w-full"
          placeholder="Write your review..."
          required
        />
      </div>

      {/* 📸 IMAGE UPLOAD */}
      <div>
        <label className="text-sm font-medium">Upload Images</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="block mt-1"
        />

        {/* 🔥 PREVIEW */}
        {previewUrls.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {previewUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                className="w-20 h-20 object-cover rounded-lg border"
              />
            ))}
          </div>
        )}
      </div>

      {/* 🚀 SUBMIT */}
      <button
        disabled={loading}
        className="bg-black text-white px-6 py-2 rounded-xl w-full"
      >
        {loading ? "Uploading..." : "Submit Review"}
      </button>
    </form>
  );
}
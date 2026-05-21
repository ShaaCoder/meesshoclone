"use client";

import {
  Upload,
  X,
} from "lucide-react";

import {
  useState,
} from "react";

export default function ReturnImageUpload() {

  const [
    previews,
    setPreviews,
  ] = useState<string[]>(
    []
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const files =
      Array.from(
        e.target.files || []
      );

    const urls =
      files.map((file) =>
        URL.createObjectURL(
          file
        )
      );

    setPreviews(urls);
  };

  return (
    <div>

      <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-3">

        Upload Images
      </label>

      <label className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition">

        <Upload className="w-10 h-10 text-zinc-400 mb-4" />

        <p className="font-semibold text-zinc-900 dark:text-white">
          Upload Product Images
        </p>

        <p className="text-sm text-zinc-500 mt-1">
          JPG, PNG, WEBP up to 10MB
        </p>

        <input
          type="file"
          name="images"
          multiple
          accept="image/*"
          className="hidden"
          onChange={
            handleChange
          }
        />
      </label>

      {/* PREVIEW */}

      {previews.length >
        0 && (
        <div className="flex flex-wrap gap-4 mt-5">

          {previews.map(
            (
              image,
              index
            ) => (
              <div
                key={index}
                className="relative"
              >

                <img
                  src={image}
                  alt=""
                  className="w-24 h-24 rounded-2xl object-cover border border-zinc-300 dark:border-zinc-700"
                />

                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center">

                  <X className="w-3 h-3 text-white" />
                </div>
              </div>
            )
          )}
        </div>
      )}

      <p className="text-xs text-zinc-500 mt-3">
        Upload clear product images for faster approval.
      </p>
    </div>
  );
}
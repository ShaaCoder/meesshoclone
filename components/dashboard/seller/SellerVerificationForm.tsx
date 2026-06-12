"use client";

import { useState, useTransition } from "react";
import { submitSellerDocuments } from "@/app/actions/seller";

type Props = {
  existing?: any;
};

export default function SellerVerificationForm({
  existing,
}: Props) {
  const [pending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState("");

  const status =
    existing?.verification_status;

  return (
    <div className="bg-white text-black rounded-2xl border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold">
          Seller Verification
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Upload your GST, PAN,
          Aadhaar and Bank Proof
          documents.
        </p>
      </div>

      {status === "approved" && (
        <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 text-green-700">
          ✅ Your seller account has
          been verified.
        </div>
      )}

      {status === "pending" && (
        <div className="mb-6 rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-yellow-700">
          ⏳ Verification is under
          review.
        </div>
      )}

      {status === "rejected" && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="font-medium text-red-700">
            Verification Rejected
          </div>

          <div className="text-sm text-red-600 mt-1">
            {existing?.rejection_reason ||
              "Please re-upload your documents."}
          </div>
        </div>
      )}

      <form
        action={(formData) => {
          setMessage("");

          startTransition(async () => {
            try {
              await submitSellerDocuments(
                formData
              );

              setMessage(
                "Documents submitted successfully."
              );
            } catch (error: any) {
              setMessage(
                error?.message ||
                  "Submission failed"
              );
            }
          });
        }}
        className="space-y-6"
      >
        {/* PAN */}

        <div>
          <label className="block text-sm font-medium mb-2">
            PAN Number
          </label>

          <input
            type="text"
            name="pan_number"
            defaultValue={
              existing?.pan_number || ""
            }
            required
            className="w-full border rounded-lg px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            PAN Card Image
          </label>

          <input
            type="file"
            name="pan_image"
            accept="image/*,.pdf"
            required={!existing}
            className="w-full border rounded-lg px-4 py-3"
          />
        </div>

        {/* AADHAAR */}

        <div>
          <label className="block text-sm font-medium mb-2">
            Aadhaar Number
          </label>

          <input
            type="text"
            name="aadhaar_number"
            defaultValue={
              existing?.aadhaar_number ||
              ""
            }
            required
            className="w-full border rounded-lg px-4 py-3"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Aadhaar Front
            </label>

            <input
              type="file"
              name="aadhaar_front"
              accept="image/*,.pdf"
              required={!existing}
              className="w-full border rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Aadhaar Back
            </label>

            <input
              type="file"
              name="aadhaar_back"
              accept="image/*,.pdf"
              required={!existing}
              className="w-full border rounded-lg px-4 py-3"
            />
          </div>
        </div>

        {/* GST */}

        <div>
          <label className="block text-sm font-medium mb-2">
            GST Number
          </label>

          <input
            type="text"
            name="gst_number"
            defaultValue={
              existing?.gst_number || ""
            }
            required
            className="w-full border rounded-lg px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            GST Certificate
          </label>

          <input
            type="file"
            name="gst_certificate"
            accept="image/*,.pdf"
            required={!existing}
            className="w-full border rounded-lg px-4 py-3"
          />
        </div>

        {/* BANK */}

        <div>
          <label className="block text-sm font-medium mb-2">
            Bank Proof / Cancelled
            Cheque
          </label>

          <input
            type="file"
            name="bank_proof"
            accept="image/*,.pdf"
            required={!existing}
            className="w-full border rounded-lg px-4 py-3"
          />
        </div>

        {/* BUTTON */}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-black  py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {pending
            ? "Submitting..."
            : existing
            ? "Update Documents"
            : "Submit Verification"}
        </button>

        {message && (
          <div className="text-sm text-center">
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
"use client";

import Link from "next/link";

export default function SellerVerificationList({
  sellers,
}: any) {
  if (!sellers?.length) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        No verification requests found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sellers.map((seller: any) => (
        <div
          key={seller.id}
          className="bg-white border rounded-2xl p-5"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* LEFT */}
            <div>
              <h3 className="font-semibold text-lg">
                {seller.users?.name || "-"}
              </h3>

              <p className="text-sm text-gray-500">
                {seller.users?.email}
              </p>

              <p className="text-sm text-gray-500">
                {seller.users?.phone}
              </p>

              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <span>
                  GST:
                  <span className="font-medium ml-1">
                    {seller.gst_number}
                  </span>
                </span>

                <span>
                  PAN:
                  <span className="font-medium ml-1">
                    {seller.pan_number}
                  </span>
                </span>
              </div>

              <div className="mt-2 text-xs text-gray-400">
                Submitted:
                {" "}
                {new Date(
                  seller.created_at
                ).toLocaleDateString()}
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col items-end gap-3">
              <StatusBadge
                status={
                  seller.verification_status
                }
              />

              <Link
                href={`/dashboard/admin/seller-verification/${seller.seller_id}`}
                className="px-4 py-2 rounded-lg bg-black text-white"
              >
                Review Documents
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (status === "approved") {
    return (
      <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
        Rejected
      </span>
    );
  }

  return (
    <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700">
      Pending
    </span>
  );
}
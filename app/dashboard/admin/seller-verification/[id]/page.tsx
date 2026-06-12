import Image from "next/image";
import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  approveSellerVerification,
  rejectSellerVerification,
} from "@/app/actions/admin";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

async function getSignedUrl(
  path?: string | null
) {
  if (!path) return null;

  const { data } =
    await supabaseAdmin.storage
      .from("seller-documents")
      .createSignedUrl(
        path,
        60 * 60
      );

  return data?.signedUrl || null;
}

export default async function SellerVerificationDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const { data: sellerDoc } =
    await supabaseAdmin
      .from("seller_documents")
      .select(`
        *,
        users:seller_id (
          id,
          name,
          email,
          phone,
          seller_verified
        )
      `)
      .eq("seller_id", id)
      .single();

  if (!sellerDoc) {
    notFound();
  }

  const panUrl =
    await getSignedUrl(
      sellerDoc.pan_image
    );

  const aadhaarFrontUrl =
    await getSignedUrl(
      sellerDoc.aadhaar_front
    );

  const aadhaarBackUrl =
    await getSignedUrl(
      sellerDoc.aadhaar_back
    );

  const gstUrl =
    await getSignedUrl(
      sellerDoc.gst_certificate
    );

  const bankUrl =
    await getSignedUrl(
      sellerDoc.bank_proof
    );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Seller Verification
        </h1>

        <p className="text-gray-500 mt-2">
          Review seller documents
        </p>
      </div>

      {/* SELLER INFO */}

      <div className="bg-white rounded-2xl border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          Seller Information
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <Info
            label="Name"
            value={
              sellerDoc.users?.name
            }
          />

          <Info
            label="Email"
            value={
              sellerDoc.users?.email
            }
          />

          <Info
            label="Phone"
            value={
              sellerDoc.users?.phone
            }
          />

          <Info
            label="PAN"
            value={
              sellerDoc.pan_number
            }
          />

          <Info
            label="GST"
            value={
              sellerDoc.gst_number
            }
          />

          <Info
            label="Status"
            value={
              sellerDoc.verification_status
            }
          />
        </div>
      </div>

      {/* DOCUMENTS */}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <DocumentCard
          title="PAN Card"
          url={panUrl}
        />

        <DocumentCard
          title="Aadhaar Front"
          url={aadhaarFrontUrl}
        />

        <DocumentCard
          title="Aadhaar Back"
          url={aadhaarBackUrl}
        />

        <DocumentCard
          title="GST Certificate"
          url={gstUrl}
        />

        <DocumentCard
          title="Bank Proof"
          url={bankUrl}
        />
      </div>

      {/* ACTIONS */}

      {sellerDoc.verification_status ===
        "pending" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* APPROVE */}

          <form
            action={async () => {
              "use server";

              await approveSellerVerification(
                sellerDoc.seller_id
              );
            }}
            className="border rounded-2xl p-6 bg-white"
          >
            <h3 className="font-semibold mb-4">
              Approve Seller
            </h3>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl"
            >
              Approve
            </button>
          </form>

          {/* REJECT */}

          <form
            action={async (
              formData
            ) => {
              "use server";

              const reason =
                String(
                  formData.get(
                    "reason"
                  ) || ""
                );

              await rejectSellerVerification(
                sellerDoc.seller_id,
                reason
              );
            }}
            className="border rounded-2xl p-6 bg-white"
          >
            <h3 className="font-semibold mb-4">
              Reject Seller
            </h3>

            <textarea
              name="reason"
              required
              placeholder="Enter rejection reason..."
              className="w-full border rounded-xl p-3 min-h-[120px]"
            />

            <button
              type="submit"
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl"
            >
              Reject
            </button>
          </form>
        </div>
      )}

      {/* REJECTION REASON */}

      {sellerDoc.rejection_reason && (
        <div className="mt-6 border border-red-200 bg-red-50 rounded-2xl p-5">
          <h3 className="font-semibold text-red-700">
            Rejection Reason
          </h3>

          <p className="mt-2 text-red-600">
            {
              sellerDoc.rejection_reason
            }
          </p>
        </div>
      )}
    </div>
  );
}

/* ============================= */
/* INFO */
/* ============================= */

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <div className="text-sm text-gray-500">
        {label}
      </div>

      <div className="font-medium">
        {value || "-"}
      </div>
    </div>
  );
}

/* ============================= */
/* DOCUMENT */
/* ============================= */

function DocumentCard({
  title,
  url,
}: {
  title: string;
  url?: string | null;
}) {
  return (
    <div className="border rounded-2xl bg-white overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">
          {title}
        </h3>
      </div>

      <div className="p-4">
        {url ? (
          <>
            <div className="relative h-72 w-full border rounded-xl overflow-hidden">
              <Image
                src={url}
                alt={title}
                fill
                className="object-contain"
              />
            </div>

            <a
              href={url}
              target="_blank"
              className="inline-block mt-3 text-blue-600"
            >
              Open Full Document
            </a>
          </>
        ) : (
          <div className="text-gray-500">
            No document found
          </div>
        )}
      </div>
    </div>
  );
}
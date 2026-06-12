import { getSellerDocuments } from "@/app/actions/seller";
import SellerVerificationForm from "@/components/dashboard/seller/SellerVerificationForm";

export default async function SellerVerificationPage() {
  const documents =
    await getSellerDocuments();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Seller Verification
        </h1>

        <p className="text-gray-500 mt-2">
          Complete your KYC verification
          to activate product listings,
          withdrawals and marketplace
          features.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h2 className="font-semibold text-blue-900 mb-2">
            Required Documents
          </h2>

          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              • PAN Card
            </li>

            <li>
              • Aadhaar Front &
              Back
            </li>

            <li>
              • GST Certificate
            </li>

            <li>
              • Bank Proof /
              Cancelled Cheque
            </li>
          </ul>
        </div>

        <SellerVerificationForm
          existing={documents}
        />
      </div>
    </div>
  );
}
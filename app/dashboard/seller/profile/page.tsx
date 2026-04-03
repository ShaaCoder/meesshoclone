import { saveBankDetailsAction } from "@/app/actions/wallet";
import { getSupabaseServer } from "@/lib/supabase-server";

export default async function SellerProfilePage() {
  const supabase = await getSupabaseServer();

  /* ============================= */
  /* 🔐 GET USER */
  /* ============================= */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  /* ============================= */
  /* 👤 GET PROFILE */
  /* ============================= */
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  /* ============================= */
  /* 🏦 GET BANK */
  /* ============================= */
  const { data: bank } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("reseller_id", user.id)
    .single();

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 text-black">

      <h1 className="text-2xl font-bold">Seller Profile</h1>

      {/* ============================= */}
      {/* 👤 BASIC INFO (READ ONLY) */}
      {/* ============================= */}
      <div className="bg-white p-5 rounded-xl shadow space-y-3">
        <h2 className="font-semibold text-lg">Basic Info</h2>

        <div className="grid gap-3">

          <div>
            <label className="text-sm text-gray-500">Name</label>
            <div className="input bg-gray-100">
              {profile?.name || "Not set"}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Email</label>
            <div className="input bg-gray-100">
              {profile?.email}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Phone</label>
            <div className="input bg-gray-100">
              {profile?.phone || "Not set"}
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Contact admin to update profile details
          </p>
        </div>
      </div>

      {/* ============================= */}
      {/* 🏦 BANK STATUS */}
      {/* ============================= */}
      {bank && (
        <div
          className={`p-3 rounded text-sm ${
            bank.is_verified
              ? "bg-green-100 text-green-600"
              : "bg-yellow-100 text-yellow-600"
          }`}
        >
          {bank.is_verified
            ? "Bank Verified ✅"
            : "Verification Pending ⏳"}
        </div>
      )}

      {/* ============================= */}
      {/* 🏦 BANK FORM */}
      {/* ============================= */}
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="font-semibold text-lg mb-4">
          Bank Details
        </h2>

        <form action={saveBankDetailsAction} className="space-y-4">

          <input
            name="name"
            placeholder="Account Holder Name"
            defaultValue={bank?.account_holder_name || ""}
            className="input"
          />

          <input
            name="accountNumber"
            placeholder="Account Number"
            defaultValue={bank?.account_number || ""}
            className="input"
          />

          <input
            name="ifsc"
            placeholder="IFSC Code"
            defaultValue={bank?.ifsc_code || ""}
            className="input"
          />

          <input
            name="bankName"
            placeholder="Bank Name"
            defaultValue={bank?.bank_name || ""}
            className="input"
          />

          <input
            name="upi"
            placeholder="UPI ID (optional)"
            defaultValue={bank?.upi_id || ""}
            className="input"
          />

          <button className="bg-black text-white px-4 py-2 rounded w-full">
            Save Bank Details
          </button>
        </form>
      </div>
    </div>
  );
}
import { saveBankDetailsAction } from "@/app/actions/wallet";
import { getSupabaseServer } from "@/lib/supabase-server";
import { User, Mail, Phone, CreditCard } from "lucide-react";

export default async function SellerProfilePage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: bank } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("reseller_id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-white">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Profile 👤</h1>
        <p className="text-zinc-400 text-sm">
          Manage your account & payout details
        </p>
      </div>

      {/* ============================= */}
      {/* 👤 PROFILE CARD */}
      {/* ============================= */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">

        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-xl">
          👨‍💼
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-lg font-semibold">
            {profile?.name || "No Name"}
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-zinc-400">

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {profile?.email}
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {profile?.phone || "Not set"}
            </div>

          </div>

          <p className="text-xs text-zinc-500">
            Contact admin to update profile details
          </p>
        </div>
      </div>

      {/* ============================= */}
      {/* 🏦 BANK STATUS */}
      {/* ============================= */}
      {bank && (
        <div
          className={`p-4 rounded-xl text-sm border ${
            bank.is_verified
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          }`}
        >
          {bank.is_verified
            ? "✅ Bank Verified — You can withdraw funds"
            : "⏳ Bank verification pending"}
        </div>
      )}

      {/* ============================= */}
      {/* 🏦 BANK FORM */}
      {/* ============================= */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

        <h2 className="font-semibold mb-6 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          Bank Details
        </h2>

        <form
          action={saveBankDetailsAction}
          className="grid md:grid-cols-2 gap-4"
        >

          <Input
            name="name"
            placeholder="Account Holder Name"
            defaultValue={bank?.account_holder_name}
          />

          <Input
            name="bankName"
            placeholder="Bank Name"
            defaultValue={bank?.bank_name}
          />

          <Input
            name="accountNumber"
            placeholder="Account Number"
            defaultValue={bank?.account_number}
          />

          <Input
            name="ifsc"
            placeholder="IFSC Code"
            defaultValue={bank?.ifsc_code}
          />

          <Input
            name="upi"
            placeholder="UPI ID (optional)"
            defaultValue={bank?.upi_id}
          />

          {/* FULL WIDTH BUTTON */}
          <div className="md:col-span-2">
            <button className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-medium transition">
              Save Bank Details
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

/* ================= INPUT ================= */
function Input({ name, placeholder, defaultValue }: any) {
  return (
    <input
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue || ""}
      className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black"
    />
  );
}
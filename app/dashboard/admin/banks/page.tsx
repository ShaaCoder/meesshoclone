import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyBankAccount } from "@/app/actions/admin";

export default async function AdminBankPage() {
  const { data: banks } = await supabaseAdmin
    .from("bank_accounts")
    .select("*, users(name, email, phone)")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 space-y-6 text-black">
      <h1 className="text-3xl font-bold">Bank Verification</h1>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Seller</th>
              <th className="p-3">Bank Details</th>
              <th className="p-3">UPI</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {banks?.map((bank: any) => (
              <tr key={bank.id} className="border-t">

                {/* 👤 SELLER INFO */}
                <td className="p-3">
                  <div className="font-semibold">
                    {bank.users?.name || "No Name"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {bank.users?.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    {bank.users?.phone || "No Phone"}
                  </div>
                </td>

                {/* 🏦 BANK */}
                <td className="p-3">
                  <div className="font-medium">
                    {bank.account_holder_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {bank.bank_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    A/C: ****{bank.account_number?.slice(-4)}
                  </div>
                  <div className="text-xs text-gray-500">
                    IFSC: {bank.ifsc_code}
                  </div>
                </td>

                {/* 💳 UPI */}
                <td className="p-3 text-xs">
                  {bank.upi_id || "-"}
                </td>

                {/* STATUS */}
                <td className="p-3">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      bank.is_verified
                        ? "bg-green-100 text-green-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {bank.is_verified ? "Verified" : "Pending"}
                  </span>
                </td>

                {/* ACTION */}
                <td className="p-3">

                  {!bank.is_verified ? (
                    <form
                      action={async () => {
                        "use server";
                        await verifyBankAccount(bank.reseller_id);
                      }}
                    >
                      <button className="bg-green-600 text-white px-3 py-1 rounded text-xs">
                        Verify
                      </button>
                    </form>
                  ) : (
                    <span className="text-green-600 text-xs">
                      Approved
                    </span>
                  )}

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { supabaseAdmin } from "@/lib/supabase-admin";
import SellerVerificationList from "@/components/dashboard/admin/SellerVerificationList";

export default async function Page() {
  const { data } =
    await supabaseAdmin
      .from("seller_documents")
      .select(`
        *,
        users:seller_id(
          id,
          name,
          email,
          phone
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Seller Verification
      </h1>

      <SellerVerificationList
        sellers={data || []}
      />
    </div>
  );
}
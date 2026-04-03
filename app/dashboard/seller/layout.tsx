// app/dashboard/seller/layout.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import SellerSidebar from "@/components/dashboard/seller/SellerSidebar";
import SellerHeader from "@/components/dashboard/seller/SellerHeader";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "seller") {
    return redirect("/dashboard");
  }

  if (profile?.status !== "approved") {
    return (
      <div className="p-10 text-center">
        ⏳ Waiting for admin approval...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SellerSidebar />

      <div className="flex-1 flex flex-col">
        <SellerHeader />

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
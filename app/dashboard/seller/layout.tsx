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
    .select("role")
    .eq("id", user.id)
    .single();

  /* ❗ IMPORTANT FIX */
  if (!profile) return null;

  if (profile.role !== "seller") {
    return redirect("/");
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      <SellerSidebar />

      <div className="flex-1 flex flex-col">
        <SellerHeader />

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
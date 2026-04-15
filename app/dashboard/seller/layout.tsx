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
  const { data: { user } } = await supabase.auth.getUser();

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
      <div className="p-10 text-center text-white bg-zinc-950 min-h-screen">
        ⏳ Waiting for admin approval...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar - Fixed Width */}
      <SellerSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <SellerHeader />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto bg-zinc-950 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
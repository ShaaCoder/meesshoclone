import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import Sidebar from "@/components/dashboard/users/Sidebar";
import Header from "@/components/dashboard/users/Header";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ✅ get full profile (important)
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  if (profile.role !== "customer") redirect("/dashboard");

  return (
    <div className="flex h-screen overflow-hidden">

      {/* 🔥 Sidebar */}
      <Sidebar user={profile} />

      {/* 🔥 Main Area */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <Header user={profile} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-zinc-950">
          {children}
        </main>

      </div>
    </div>
  );
}
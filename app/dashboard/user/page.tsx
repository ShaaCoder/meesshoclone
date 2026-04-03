// app/dashboard/user/page.tsx
import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Package, 
  Calendar, 
  IndianRupee, 
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle 
} from "lucide-react";

export default async function UserDashboard() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

const { data: orders } = await supabase
  .from("orders")
  .select(`
    *,
    order_items (
      id
    )
  `)
  .eq("customer_id", user.id)
  .order("created_at", { ascending: false });
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "placed": return <Clock className="w-4 h-4" />;
      case "shipped": return <Truck className="w-4 h-4" />;
      case "delivered": return <CheckCircle2 className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "placed": return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
      case "shipped": return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
      case "delivered": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
      default: return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
          <Package className="w-9 h-9" />
          My Orders
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Track and manage all your orders in one place
        </p>
      </div>

      {orders?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white">No orders yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
            When you make your first purchase, your orders will appear here.
          </p>
          <Link 
            href="/shop"
            className="mt-6 px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded-xl font-medium hover:scale-105 transition"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders?.map((order: any) => (
            <Link 
              key={order.id} 
            href={`/dashboard/user/orders/${order.order_code}`}
              className="group block"
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
                          ORDER #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="font-semibold text-lg text-zinc-900 dark:text-white mt-1 group-hover:text-primary transition">
                          {order.order_items?.length || 0} items
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 md:items-center">
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(order.created_at), "dd MMM yyyy")}
                    </div>

                    <div className="flex items-center gap-1.5 font-semibold text-xl text-zinc-900 dark:text-white">
                      <IndianRupee className="w-5 h-5" />
                      {order.total_amount?.toLocaleString("en-IN")}
                    </div>

                    <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
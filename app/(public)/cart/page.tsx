// app/cart/page.tsx
import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import CartItem from "@/components/CartItem";
import CheckoutForm from "@/components/CheckoutForm";
import { ArrowLeft, ShoppingCart } from "lucide-react";

export default async function CartPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: cart } = await supabase
    .from("cart")
    .select("id, quantity, products(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const total =
    cart?.reduce((sum: number, item: any) => {
      const product = item.products;
      const price = Number(product.selling_price) || Number(product.base_price);
      return sum + item.quantity * price;
    }, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Continue Shopping</span>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6" />
            <h1 className="text-3xl font-bold tracking-tight">Your Cart</h1>
          </div>

          <div className="w-24" /> {/* Spacer for balance */}
        </div>

        {cart?.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid lg:grid-cols-12 gap-10">
            {/* Cart Items */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  Cart Items ({cart?.length})
                </h2>

                <div className="space-y-6">
                  {cart?.map((item: any) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary & Checkout */}
            <div className="lg:col-span-5">
              <div className="sticky top-8 space-y-8">
                {/* Order Summary */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
                  <h2 className="text-xl font-semibold mb-5">Order Summary</h2>

                  <div className="space-y-4">
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="font-medium">₹{total}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                      <span className="text-green-600 font-medium">FREE</span>
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-zinc-800 my-4" />
                    <div className="flex justify-between text-2xl font-bold">
                      <span>Total</span>
                      <span>₹{total}</span>
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div className="mt-6">
                    <input
                      type="text"
                      placeholder="Promo code"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                    />
                    <button className="mt-3 w-full bg-gray-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-colors text-white py-3 rounded-xl font-semibold">
                      Apply Coupon
                    </button>
                  </div>
                </div>

                {/* Checkout Form */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
                  <h2 className="text-xl font-semibold mb-5">Shipping Details</h2>
                  <CheckoutForm user={user} />
                </div>

                {/* Trust Badges */}
                <div className="flex justify-center gap-6 text-xs text-gray-500">
                  <div>🔒 Secure Checkout</div>
                  <div>🚚 Fast Delivery</div>
                  <div>⭐ 30-Day Return</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Empty Cart Component */
function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
        <ShoppingCart className="w-12 h-12 text-gray-400" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        Looks like you haven&apos;t added anything yet. Start shopping to fill your cart!
      </p>
      <a
        href="/"
        className="bg-black text-white dark:bg-white dark:text-black px-8 py-3.5 rounded-2xl font-semibold hover:scale-105 transition-transform"
      >
        Browse Products
      </a>
    </div>
  );
}
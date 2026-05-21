import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import CartItem from "@/components/CartItem";
import CheckoutForm from "@/components/CheckoutForm";
import { ArrowLeft, ShoppingCart } from "lucide-react";

/* ============================= */
/* 🧠 PRICE UTIL (SAME LOGIC) */
/* ============================= */
function getPrice(variant: any) {
  if (!variant) return 0;

  if (Number(variant.selling_price) > 0) return Number(variant.selling_price);

  const fallback =
    Number(variant.cost_price || 0) +
    Number(variant.platform_margin || 0);

  if (fallback > 0) return fallback;

  if (Number(variant.mrp) > 0) return Number(variant.mrp);

  return 0;
}

export default async function CartPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  /* ============================= */
  /* 📦 FETCH CART */
  /* ============================= */
  const { data: cart, error: cartError } = await supabase
    .from("cart")
    .select(`
      id,
      quantity,
      products:product_id (
        id,
        name,
        categories ( gst_percent ),
        product_images ( url, is_primary )
      ),
      product_variants:variant_id (
        id,
        selling_price,
        cost_price,
        platform_margin,
        mrp
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (cartError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="bg-white border rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Cart unavailable</h2>
            <p className="text-sm text-gray-600 mt-2">
              {cartError.message}
            </p>
            <p className="text-xs text-gray-500 mt-3">
              This usually means the `cart` table is missing in Supabase or RLS is blocking access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const safeCart = cart || [];

  /* ============================= */
  /* 💰 TOTAL */
  /* ============================= */
  let subtotal = 0;
  let totalGst = 0;

  safeCart.forEach((item: any) => {
    const variant = Array.isArray(item.product_variants)
      ? item.product_variants[0]
      : item.product_variants;
    
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    const category = Array.isArray(product?.categories) ? product.categories[0] : product?.categories;
    const gstPercent = Number(category?.gst_percent || 18);

    const price = getPrice(variant);
    const gstAmount = Math.round(((price * gstPercent) / 100) * item.quantity);

    subtotal += price * item.quantity;
    totalGst += gstAmount;
  });

  const total = subtotal + totalGst;

  /* ============================= */
  /* 🧾 UI */
  /* ============================= */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* HEADER */}
        <div className="flex justify-between mb-10">
          <a href="/" className="flex items-center gap-2 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </a>

          <div className="flex items-center gap-2">
            <ShoppingCart />
            <h1 className="text-2xl font-bold">Your Cart</h1>
          </div>

          <div />
        </div>

        {safeCart.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid lg:grid-cols-12 gap-10">

            {/* ITEMS */}
            <div className="lg:col-span-7 space-y-6">
              {safeCart.map((item: any) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>

            {/* SUMMARY */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow border">
                <h2 className="font-semibold mb-4">Order Summary</h2>

                <div className="flex justify-between mb-2">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>

                <div className="flex justify-between mb-2">
                  <span>GST/Taxes</span>
                  <span>₹{totalGst}</span>
                </div>

                <div className="flex justify-between mb-2">
                  <span>Shipping</span>
                  <span className="text-green-600">FREE</span>
                </div>

                <hr className="my-3" />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow border">
                <h2 className="font-semibold mb-4">Shipping Details</h2>
                <CheckoutForm user={user} addresses={addresses || []} />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

/* ============================= */
/* EMPTY */
/* ============================= */
function EmptyCart() {
  return (
    <div className="text-center py-20">
      <h2 className="text-xl font-semibold">Your cart is empty</h2>
      <a href="/" className="mt-4 inline-block bg-black text-white px-6 py-2 rounded">
        Shop Now
      </a>
    </div>
  );
}
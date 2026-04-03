import Link from "next/link";

export default function ProductCard({ product }: any) {
  return (
    <Link href={`/product/${product.id}`}>
      <div className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden cursor-pointer">

        <img
          src={product.image}
          className="w-full h-48 object-cover"
        />

        <div className="p-3">
          <h2 className="font-semibold text-sm line-clamp-2">
            {product.name}
          </h2>

          <p className="text-lg font-bold mt-1">
            ₹{product.price}
          </p>
        </div>
      </div>
    </Link>
  );
}
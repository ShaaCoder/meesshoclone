export default function ProductSkeleton() {
  return (
    <div className="p-4 pb-20 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-square bg-gray-200" />
          <div className="p-3 space-y-3">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-6 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
import { useState, useMemo } from "react";

export function useSearch(products: any[]) {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!query) return products;

    return products.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, products]);

  return {
    query,
    setQuery,
    filteredProducts,
  };
}
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useSearchProducts(query: string) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .ilike("name", `%${query}%`)
        .limit(5);

      if (!error && data) {
        setResults(data);
      }

      setLoading(false);
    };

    fetchProducts();
  }, [query]);

  return { results, loading };
}
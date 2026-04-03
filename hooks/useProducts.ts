import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  status: string;
};

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]); // ✅ FIX

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "approved");

      if (error) {
        console.error(error);
        return;
      }

      setProducts(data || []);
    };

    fetchProducts();
  }, []);

  return products;
}
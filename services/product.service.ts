import { supabase } from "@/lib/supabase";

export const getProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data;
};
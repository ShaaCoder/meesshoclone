"use server";

import { getSupabaseServer } from "@/lib/supabase-server";

type HSNRow = {
  keyword: string;
  hsn_code: string;
  gst_percent: number;
  priority: number;
};

export async function getGSTHSN(categoryId: string, productName: string) {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from("hsn_tax_codes")
    .select("*")
    .eq("category_id", categoryId)
    .order("priority", { ascending: false })
    .limit(5);

  // ✅ normalize null → []
  const categoryMatch: HSNRow[] = data ?? [];

  let bestMatch: HSNRow | null = null;

  const name = productName.toLowerCase();

  // ✅ no null issues now
  bestMatch =
    categoryMatch.find((item) =>
      name.includes(item.keyword.toLowerCase())
    ) || null;

  // ✅ safe length check
  if (!bestMatch && categoryMatch.length > 0) {
    bestMatch = categoryMatch[0];
  }

  return {
    gst: bestMatch?.gst_percent || "",
    hsn: bestMatch?.hsn_code || "",
  };
}
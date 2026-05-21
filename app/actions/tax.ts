"use server";

import { getSupabaseServer } from "@/lib/supabase-server";

/* ============================= */
/* 🧠 TYPES */
/* ============================= */
type HSNRow = {
  keyword: string;
  hsn_code: string;
  gst_percent: number;
  priority: number;
};

/* ============================= */
/* 🧠 HELPERS */
/* ============================= */
function normalize(text: string) {
  return text.toLowerCase().trim();
}

/* ============================= */
/* 🎯 MATCH SCORE */
/* ============================= */
function getMatchScore(name: string, keyword: string) {
  if (!keyword) return 0;

  const words = keyword.toLowerCase().split(" ");
  let score = 0;

  for (const word of words) {
    if (name.includes(word)) score++;
  }

  return score;
}

/* ============================= */
/* 🧾 MAIN FUNCTION */
/* ============================= */
export async function getGSTHSN(
  categoryId: string,
  productName: string
) {
  const supabase = await getSupabaseServer();

  const name = normalize(productName);

  /* ============================= */
  /* 📦 FETCH CATEGORY HSN */
  /* ============================= */
  const { data } = await supabase
    .from("hsn_tax_codes")
    .select("*")
    .eq("category_id", categoryId)
    .order("priority", { ascending: false });

  const rows: HSNRow[] = data ?? [];

  let bestMatch: HSNRow | null = null;
  let bestScore = 0;

  /* ============================= */
  /* 🔍 SMART MATCHING */
  /* ============================= */
  for (const row of rows) {
    const score = getMatchScore(name, row.keyword);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = row;
    }
  }

  /* ============================= */
  /* 🧠 FALLBACK LOGIC */
  /* ============================= */
  if (!bestMatch && rows.length > 0) {
    bestMatch = rows[0]; // highest priority
  }

  /* ============================= */
  /* 🛡 GLOBAL DEFAULT */
  /* ============================= */
  if (!bestMatch) {
    return {
      gst: 12, // default GST
      hsn: "0000",
    };
  }

  return {
    gst: Number(bestMatch.gst_percent || 0),
    hsn: String(bestMatch.hsn_code || ""),
  };
}
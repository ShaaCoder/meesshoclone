import { getSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import CategoryClient from "./CategoryClient";

export default async function CategoryPage({ params }: any) {
  const supabase = await getSupabaseServer();
  const { slug } = await params;

  // 1️⃣ Get category
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!category) return notFound();

  return <CategoryClient category={category} />;
}
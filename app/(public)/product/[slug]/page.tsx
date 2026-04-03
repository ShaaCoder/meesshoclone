import { getSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import ProductClient from "./ProductClient";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await getSupabaseServer();

  const { data: product, error } = await supabase
    .from("products")
    .select(`
      *,
      product_variants(*),
      product_attributes(value, attributes(name))
    `)
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (error || !product) return notFound();

  return <ProductClient product={product} />;
}
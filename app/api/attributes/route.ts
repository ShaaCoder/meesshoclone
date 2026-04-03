

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category_id = searchParams.get("category_id");

  if (!category_id) return NextResponse.json([]);

  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from("category_attributes")
    .select("is_required, attributes(*)")
    .eq("category_id", category_id);

  const formatted =
    data?.map((item: any) => ({
      ...item.attributes,
      is_required: item.is_required,
    })) || [];

  return NextResponse.json(formatted);
}
import { NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

/* ============================= */
/* 🚚 SHIPROCKET RETURN WEBHOOK */
/* ============================= */

export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json();

    console.log(
      "RETURN WEBHOOK:",
      JSON.stringify(
        body,
        null,
        2
      )
    );

    /* ============================= */
    /* 📦 DATA */
    /* ============================= */

    const awb =
      body?.awb ||
      body?.awb_code;

    const status = String(
      body?.current_status ||
        body?.status ||
        ""
    ).toLowerCase();

    if (!awb) {
      return Response.json({
        success: false,
        message: "AWB missing",
      });
    }

    /* ============================= */
    /* 🔍 FIND RETURN */
    /* ============================= */

    const { data: returnData } =
      await supabaseAdmin
        .from("returns")
        .select("*")
        .eq("pickup_awb", awb)
        .single();

    if (!returnData) {
      return Response.json({
        success: false,
        message:
          "Return not found",
      });
    }

    /* ============================= */
    /* 🚚 PICKED UP */
    /* ============================= */

    if (
      status.includes(
        "pickup scheduled"
      ) ||
      status.includes("pickup")
    ) {
      await supabaseAdmin
        .from("returns")
        .update({
          pickup_status:
            "picked_up",
        })
        .eq(
          "id",
          returnData.id
        );
    }

    /* ============================= */
    /* 🚛 IN TRANSIT */
    /* ============================= */

    if (
      status.includes(
        "in transit"
      )
    ) {
      await supabaseAdmin
        .from("returns")
        .update({
          pickup_status:
            "in_transit",
        })
        .eq(
          "id",
          returnData.id
        );
    }

    /* ============================= */
    /* ✅ DELIVERED BACK */
    /* ============================= */

    if (
      status.includes(
        "delivered"
      )
    ) {
      /* ============================= */
      /* UPDATE RETURN */
      /* ============================= */

      await supabaseAdmin
        .from("returns")
        .update({
          pickup_status:
            "delivered_to_seller",

          seller_received_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          returnData.id
        );

      /* ============================= */
      /* UPDATE ITEM */
      /* ============================= */

      await supabaseAdmin
        .from("order_items")
        .update({
          status: "returned",
        })
        .eq(
          "id",
          returnData.order_item_id
        );
    }

    /* ============================= */
    /* ❌ FAILED */
    /* ============================= */

    if (
      status.includes(
        "failed"
      ) ||
      status.includes(
        "cancelled"
      )
    ) {
      await supabaseAdmin
        .from("returns")
        .update({
          pickup_status:
            "failed",
        })
        .eq(
          "id",
          returnData.id
        );
    }

    return Response.json({
      success: true,
    });
  } catch (error: any) {
    console.error(
      "RETURN WEBHOOK ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}
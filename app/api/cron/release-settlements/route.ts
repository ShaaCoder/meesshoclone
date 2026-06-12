import { NextResponse } from "next/server";

import {
  releaseEligibleSettlements,
} from "@/services/settlement-engine";

/* =========================================================
   🧠 AUTO RELEASE CRON
   ========================================================= */

export async function GET(
  req: Request
) {
  try {
    /* =========================================================
       🔐 CRON SECRET CHECK
       ========================================================= */
const cronSecret =
  process.env.CRON_SECRET;

const url =
  new URL(req.url);

const secret =
  url.searchParams.get(
    "secret"
  );

if (
  !cronSecret ||
  secret !== cronSecret
) {
  return NextResponse.json(
    {
      error: "Unauthorized",
    },
    {
      status: 401,
    }
  );
}

    /* =========================================================
       🚀 RELEASE ELIGIBLE
       ========================================================= */

    await releaseEligibleSettlements();

    console.log(
      "✅ AUTO SETTLEMENT RELEASE COMPLETED"
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "❌ CRON RELEASE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to release settlements",
      },
      {
        status: 500,
      }
    );
  }
}
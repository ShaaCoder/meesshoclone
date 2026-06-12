"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import { createReturnShipment } from "@/services/shiprocket";
import { processRefund } from "@/services/refund-engine";

/* =========================================================
   🧠 HELPERS
========================================================= */

function revalidateReturnPaths() {
  revalidatePath("/dashboard/admin/returns");
  revalidatePath("/dashboard/user/returns");
  revalidatePath("/dashboard/seller/returns");
  revalidatePath("/dashboard/user/orders");
  revalidatePath("/dashboard/seller/orders");
  revalidatePath("/dashboard/seller/wallet");
}

function isReturnExpired(
  deadline?: string | null
) {
  if (!deadline) return false;

  return (
    new Date() >
    new Date(deadline)
  );
}

/* =========================================================
   🧠 CREATE RETURN REQUEST
========================================================= */

export async function createReturnRequest(
  formData: FormData
): Promise<void> {
  const supabase =
    await getSupabaseServer();

  /* ============================= */
  /* AUTH */
  /* ============================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Unauthorized"
    );
  }

  /* ============================= */
  /* FORM */
  /* ============================= */

  const order_item_id =
    String(
      formData.get(
        "order_item_id"
      )
    );

  const order_id = String(
    formData.get("order_id")
  );

  const reason = String(
    formData.get("reason")
  );

  const type = String(
    formData.get("type")
  );

  const description = String(
    formData.get(
      "description"
    ) || ""
  );

  /* ============================= */
  /* FETCH ITEM */
  /* ============================= */

  const {
    data: orderItem,
    error: itemError,
  } = await supabaseAdmin
    .from("order_items")
    .select(`
      *,

      orders (
        id,
        customer_id,
        order_code,
        status,
        return_deadline
      )
    `)
    .eq("id", order_item_id)
    .single();

  if (
    itemError ||
    !orderItem
  ) {
    throw new Error(
      "Order item not found"
    );
  }

  /* ============================= */
  /* SECURITY */
  /* ============================= */

  if (
    orderItem.orders
      ?.customer_id !==
    user.id
  ) {
    throw new Error(
      "Unauthorized"
    );
  }

  /* ============================= */
  /* RETURN WINDOW */
  /* ============================= */

  if (
    isReturnExpired(
      orderItem.orders
        ?.return_deadline
    )
  ) {
    throw new Error(
      "Return window expired"
    );
  }

  /* ============================= */
  /* ITEM STATUS */
  /* ============================= */

  if (
    orderItem.status !==
    "delivered"
  ) {
    throw new Error(
      "Item not eligible for return"
    );
  }

  /* ============================= */
  /* EXISTING RETURN */
  /* ============================= */

  const {
    data: existingReturn,
  } = await supabaseAdmin
    .from("returns")
    .select("id")
    .eq(
      "order_item_id",
      order_item_id
    )
    .maybeSingle();

  if (existingReturn) {
    throw new Error(
      "Return already exists"
    );
  }

  /* ============================= */
  /* IMAGE UPLOADS */
  /* ============================= */

  const uploadedImages: string[] =
    [];

  const files =
    formData.getAll(
      "images"
    ) as File[];

  for (const file of files) {
    if (
      !file ||
      file.size === 0
    ) {
      continue;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      continue;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      continue;
    }

    const ext =
      file.name
        .split(".")
        .pop();

    const fileName = `${crypto.randomUUID()}.${ext}`;

    const path = `${user.id}/${fileName}`;

    const {
      error: uploadError,
    } =
      await supabaseAdmin.storage
        .from("returns")
        .upload(path, file);

    if (uploadError) {
      console.log(
        "UPLOAD ERROR",
        uploadError
      );

      continue;
    }

    const {
      data: publicUrl,
    } =
      supabaseAdmin.storage
        .from("returns")
        .getPublicUrl(path);

    uploadedImages.push(
      publicUrl.publicUrl
    );
  }

  /* ============================= */
  /* CREATE RETURN */
  /* ============================= */

  const {
    error: createError,
  } = await supabaseAdmin
    .from("returns")
    .insert({
      order_id,

      order_item_id,

      customer_id:
        user.id,

      seller_id:
        orderItem.seller_id,

      reason,

      type,

      description,

      return_images:
        uploadedImages,

      status:
        "requested",

      qc_status:
        "pending",

      refund_released:
        false,
    });

  if (createError) {
    console.log(
      createError
    );

    throw new Error(
      "Failed to create return"
    );
  }

  /* ============================= */
  /* UPDATE ITEM */
  /* ============================= */

  await supabaseAdmin
    .from("order_items")
    .update({
      status:
        "return_requested",
    })
    .eq(
      "id",
      order_item_id
    );

  revalidateReturnPaths();

  revalidatePath(
    `/dashboard/user/orders/${orderItem.orders?.order_code}`
  );
}

/* =========================================================
   🧠 ADMIN APPROVE RETURN
========================================================= */

export async function adminApproveReturn(
  returnId: string
): Promise<void> {

  try {

    /* ============================= */
    /* FETCH RETURN */
    /* ============================= */

    const {
      data: returnData,
      error,
    } = await supabaseAdmin
      .from("returns")
      .select(`
        *,

        orders (*),

        order_items (*),

        users!returns_customer_id_fkey (*)
      `)
      .eq("id", returnId)
      .single();

    if (
      error ||
      !returnData
    ) {
      console.error(
        "RETURN FETCH ERROR:",
        error
      );

      throw new Error(
        "Return not found"
      );
    }

    /* ============================= */
    /* CUSTOMER ADDRESS */
    /* ============================= */

    const {
      data: customerAddress,
      error: customerAddressError,
    } = await supabaseAdmin
      .from("addresses")
      .select("*")
      .eq(
        "id",
        returnData.orders
          ?.address_id
      )
      .single();

    if (
      customerAddressError ||
      !customerAddress
    ) {

      console.error(
        "CUSTOMER ADDRESS ERROR:",
        customerAddressError
      );

      throw new Error(
        "Customer address not found"
      );
    }

    /* ============================= */
    /* SELLER */
    /* ============================= */

    const {
      data: seller,
      error: sellerError,
    } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq(
        "id",
        returnData.seller_id
      )
      .single();

    if (
      sellerError ||
      !seller
    ) {

      console.error(
        "SELLER ERROR:",
        sellerError
      );

      throw new Error(
        "Seller not found"
      );
    }

    /* ============================= */
    /* SELLER ADDRESS */
    /* ============================= */

    const {
      data: sellerAddress,
      error: sellerAddressError,
    } = await supabaseAdmin
      .from("seller_addresses")
      .select("*")
      .eq(
        "seller_id",
        returnData.seller_id
      )
      .eq(
        "is_default",
        true
      )
      .single();

    if (
      sellerAddressError ||
      !sellerAddress
    ) {

      console.error(
        "SELLER ADDRESS ERROR:",
        sellerAddressError
      );

      throw new Error(
        "Seller address not found"
      );
    }

    /* ============================= */
    /* CREATE RETURN SHIPMENT */
    /* ============================= */

    const shipment =
      await createReturnShipment(
        {
          returnData,

          order:
            returnData.orders,

          customer:
            returnData.users,

          customerAddress,

          seller,

          sellerAddress,

          orderItem:
            returnData.order_items,
        }
      );

    if (!shipment) {
      throw new Error(
        "Shipment creation failed"
      );
    }

    /* ============================= */
    /* UPDATE RETURN */
    /* ============================= */

    const {
      error:
        returnUpdateError,
    } = await supabaseAdmin
      .from("returns")
      .update({

        status:
          "approved",

        pickup_status:
          "pickup_scheduled",

        pickup_shipment_id:
          shipment.shipment_id,

        pickup_awb:
          shipment.awb_code,

        pickup_courier:
          shipment.courier_name,

        pickup_tracking_url:
          shipment.tracking_url,

        approved_at:
          new Date().toISOString(),

        pickup_scheduled_at:
          new Date().toISOString(),

      })
      .eq(
        "id",
        returnId
      );

    if (
      returnUpdateError
    ) {

      console.error(
        "RETURN UPDATE ERROR:",
        returnUpdateError
      );

      throw new Error(
        returnUpdateError.message
      );
    }

    /* ============================= */
    /* UPDATE ORDER ITEM */
    /* ============================= */

    const {
      error: itemError,
    } = await supabaseAdmin
      .from("order_items")
      .update({

        status:
          "return_requested",

      })
      .eq(
        "id",
        returnData.order_item_id
      );

    if (itemError) {

      console.error(
        "ORDER ITEM UPDATE ERROR:",
        itemError
      );

      throw new Error(
        itemError.message
      );
    }

    /* ============================= */
    /* REVALIDATE */
    /* ============================= */

    revalidatePath(
      "/dashboard/admin/returns"
    );

    revalidatePath(
      "/dashboard/user/orders"
    );

    revalidatePath(
      "/dashboard/seller/orders"
    );

    revalidatePath(
      "/dashboard/admin/orders"
    );

    console.log(
      "RETURN APPROVED SUCCESSFULLY"
    );

  } catch (err: any) {

    console.error(
      "ADMIN APPROVE RETURN ERROR:",
      err
    );

    throw new Error(
      err?.message ||
      "Failed to approve return"
    );
  }
}

/* =========================================================
   🧠 REJECT RETURN
========================================================= */

export async function rejectReturn(
  returnId: string,
  note?: string
): Promise<void> {
  const {
    data: returnData,
  } = await supabaseAdmin
    .from("returns")
    .select("*")
    .eq("id", returnId)
    .single();

  await supabaseAdmin
    .from("returns")
    .update({
      status: "rejected",

      reject_reason:
        note || null,
    })
    .eq("id", returnId);

  if (
    returnData?.order_item_id
  ) {
    await supabaseAdmin
      .from("order_items")
      .update({
        status:
          "delivered",
      })
      .eq(
        "id",
        returnData.order_item_id
      );
  }

  revalidateReturnPaths();
}

/* =========================================================
   🧠 QC PASS
========================================================= */

export async function passReturnQC(
  returnId: string,
  notes?: string
): Promise<void> {
  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabaseAdmin
    .from("returns")
    .update({
      qc_status: "passed",

      qc_notes:
        notes || null,

      qc_checked_by:
        user?.id || null,

      qc_checked_at:
        new Date().toISOString(),
    })
    .eq("id", returnId);

  revalidateReturnPaths();
}

/* =========================================================
   🧠 QC FAIL
========================================================= */

export async function failReturnQC(
  returnId: string,
  notes?: string
): Promise<void> {
  const supabase =
    await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabaseAdmin
    .from("returns")
    .update({
      qc_status: "failed",

      qc_notes:
        notes || null,

      qc_checked_by:
        user?.id || null,

      qc_checked_at:
        new Date().toISOString(),

      status: "rejected",
    })
    .eq("id", returnId);

  revalidateReturnPaths();
}

/* =========================================================
   🧠 COMPLETE RETURN
========================================================= */

export async function completeReturn(
  returnId: string
): Promise<void> {
  /* ============================= */
  /* FETCH RETURN */
  /* ============================= */

  const {
    data: returnData,
    error,
  } = await supabaseAdmin
    .from("returns")
    .select(`
      *,

      orders (*),

      order_items (*)
    `)
    .eq("id", returnId)
    .single();

  if (
    error ||
    !returnData
  ) {
    throw new Error(
      "Return not found"
    );
  }

  /* ============================= */
  /* QC VALIDATION */
  /* ============================= */

  if (
    returnData.qc_status !==
    "passed"
  ) {
    throw new Error(
      "QC not passed"
    );
  }

  /* ============================= */
  /* ALREADY COMPLETED */
  /* ============================= */

  if (
    returnData.status ===
    "completed"
  ) {
    return;
  }

  /* ============================= */
  /* REFUND AMOUNT */
  /* ============================= */

  const refundAmount =
    Number(
      returnData
        .order_items
        ?.final_price || 0
    );

  /* ============================= */
  /* COMPLETE RETURN */
  /* ============================= */

  await supabaseAdmin
    .from("returns")
    .update({
      status: "completed",

      refund_released: true,

      completed_at:
        new Date().toISOString(),
    })
    .eq("id", returnId);

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

  /* ============================= */
  /* UPDATE ORDER */
  /* ============================= */

  await supabaseAdmin
    .from("orders")
    .update({
      refund_status:
        "processed",

      refund_amount:
        refundAmount,
    })
    .eq(
      "id",
      returnData.order_id
    );

  /* ============================= */
  /* REVERSE SETTLEMENT */
  /* ============================= */

  const {
    data: settlements,
  } = await supabaseAdmin
    .from("settlements")
    .select("*")
    .eq(
      "order_id",
      returnData.order_id
    )
    .in("status", [
      "locked",
      "released",
    ]);

  if (
    settlements?.length
  ) {
    await supabaseAdmin
      .from("settlements")
      .update({
        status: "reversed",

        reversed_at:
          new Date().toISOString(),
      })
      .eq(
        "order_id",
        returnData.order_id
      )
      .in("status", [
        "locked",
        "released",
      ]);

    console.log(
      "✅ SETTLEMENT REVERSED"
    );
  }

  /* ============================= */
  /* SELLER WALLET FIX */
  /* ============================= */

  const payoutAmount =
    Number(
      returnData.orders
        ?.seller_payout || 0
    );

  const {
    data: wallet,
  } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq(
      "seller_id",
      returnData.seller_id
    )
    .single();

  if (wallet) {
    let newBalance =
      Number(
        wallet.balance || 0
      );

    let newLocked =
      Number(
        wallet.locked_balance ||
          0
      );

    /* ============================= */
    /* IF PAYOUT RELEASED */
    /* ============================= */

    if (
      settlements?.some(
        (s: any) =>
          s.status ===
          "released"
      )
    ) {
      newBalance =
        Math.max(
          0,
          newBalance -
            payoutAmount
        );
    }

    /* ============================= */
    /* IF LOCKED */
    /* ============================= */

    if (
      settlements?.some(
        (s: any) =>
          s.status ===
          "locked"
      )
    ) {
      newLocked =
        Math.max(
          0,
          newLocked -
            payoutAmount
        );
    }

    await supabaseAdmin
      .from("wallets")
      .update({
        balance:
          newBalance,

        locked_balance:
          newLocked,
      })
      .eq(
        "seller_id",
        returnData.seller_id
      );

    console.log(
      "✅ SELLER WALLET UPDATED"
    );
  }

  /* ============================= */
  /* REFUND ENGINE */
  /* ============================= */

 try {

  await processRefund({
    orderId:
      returnData.order_id,

    orderItemId:
      returnData.order_item_id,

    amount:
      refundAmount,

    userId:
      returnData.customer_id,

    sellerId:
      returnData.seller_id,

    reason:
      "Product Return Refund",
  });

  console.log(
    "✅ REFUND PROCESSED"
  );

} catch (refundError) {

  console.error(
    "REFUND PROCESS ERROR",
    refundError
  );
}
  revalidateReturnPaths();

  console.log(
    "✅ RETURN COMPLETED SUCCESSFULLY"
  );
}

/* =========================================================
   🧠 PICKUP STATUS
========================================================= */

export async function markReturnPickedUp(
  returnId: string
): Promise<void> {
  await supabaseAdmin
    .from("returns")
    .update({
      pickup_status:
        "picked_up",

      picked_up_at:
        new Date().toISOString(),
    })
    .eq("id", returnId);

  revalidateReturnPaths();
}

export async function markReturnInTransit(
  returnId: string
): Promise<void> {
  await supabaseAdmin
    .from("returns")
    .update({
      pickup_status:
        "in_transit",

      in_transit_at:
        new Date().toISOString(),
    })
    .eq("id", returnId);

  revalidateReturnPaths();
}

export async function markReturnDelivered(
  returnId: string
): Promise<void> {
  const {
    data: returnData,
  } = await supabaseAdmin
    .from("returns")
    .select("*")
    .eq("id", returnId)
    .single();

  await supabaseAdmin
    .from("returns")
    .update({
      pickup_status:
        "delivered_to_seller",

      delivered_to_seller_at:
        new Date().toISOString(),
    })
    .eq("id", returnId);

  if (
    returnData?.order_item_id
  ) {
    await supabaseAdmin
      .from("order_items")
      .update({
        status:
          "return_received",
      })
      .eq(
        "id",
        returnData.order_item_id
      );
  }

  revalidateReturnPaths();
}
"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import { createReturnShipment } from "@/services/shiprocket";
import {
  refundSellerWallet,
} from "@/app/actions/wallet";
/* ============================= */
/* CREATE RETURN */
/* ============================= */

/* ============================= */
/* CREATE RETURN */
/* ============================= */

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
  /* FORM DATA */
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
  /* VALIDATE ITEM */
  /* ============================= */

  const {
    data: orderItem,
  } = await supabaseAdmin
    .from("order_items")
    .select(`
      *,
      orders (
        id,
        customer_id,
        status,
        order_code,
        return_deadline
      )
    `)
    .eq("id", order_item_id)
    .single();

  if (!orderItem) {
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
    orderItem.orders
      ?.return_deadline &&
    new Date() >
      new Date(
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
      "Item is not eligible for return"
    );
  }

  /* ============================= */
  /* CHECK EXISTING */
  /* ============================= */

  const {
    data: existing,
  } = await supabaseAdmin
    .from("returns")
    .select("id")
    .eq(
      "order_item_id",
      order_item_id
    )
    .single();

  if (existing) {
    throw new Error(
      "Return already exists"
    );
  }

  /* ============================= */
  /* UPLOAD IMAGES */
  /* ============================= */

  const files =
    formData.getAll(
      "images"
    ) as File[];

  const uploadedImages: string[] =
    [];

  for (const file of files) {

    if (
      !file ||
      file.size === 0
    ) {
      continue;
    }

    /* FILE TYPE */

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

    /* FILE SIZE */

    const maxSize =
      10 * 1024 * 1024;

    if (
      file.size > maxSize
    ) {
      continue;
    }

    /* FILE */

    const fileExt =
      file.name
        .split(".")
        .pop();

    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    /* IMPORTANT FIX */

    const filePath = `${user.id}/${fileName}`;

    const {
      error: uploadError,
    } =
      await supabaseAdmin.storage
        .from("returns")
        .upload(
          filePath,
          file,
          {
            cacheControl:
              "3600",

            upsert: false,
          }
        );

    if (uploadError) {
      console.log(
        uploadError
      );

      continue;
    }

    const {
      data: publicUrlData,
    } =
      supabaseAdmin.storage
        .from("returns")
        .getPublicUrl(
          filePath
        );

    uploadedImages.push(
      publicUrlData.publicUrl
    );
  }

  /* ============================= */
  /* CREATE RETURN */
  /* ============================= */

  const { error } =
    await supabaseAdmin
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

  if (error) {

    console.log(error);

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

  /* ============================= */
  /* REVALIDATE */
  /* ============================= */

  revalidatePath(
    "/dashboard/user/orders"
  );

  revalidatePath(
    `/dashboard/user/orders/${orderItem.orders?.order_code}`
  );

  revalidatePath(
    "/dashboard/user/returns"
  );

  revalidatePath(
    "/dashboard/admin/returns"
  );

  revalidatePath(
    "/dashboard/seller/returns"
  );
}

/* ============================= */
/* APPROVE RETURN */
/* ============================= */

export async function approveReturn(
  returnId: string
): Promise<void> {
  const {
    data: returnData,
  } = await supabaseAdmin
    .from("returns")
    .select(`
      *,
      orders (*),
      order_items (*)
    `)
    .eq("id", returnId)
    .single();

  if (!returnData) {
    throw new Error(
      "Return not found"
    );
  }

  await supabaseAdmin
    .from("returns")
    .update({
      status: "approved",

      pickup_status:
        "pickup_scheduled",

      pickup_awb:
        "SR123456789",

      pickup_tracking_url:
        "https://shiprocket.co/tracking/SR123456789",

      reverse_shipment_id:
        123456,
    })
    .eq("id", returnId);

  revalidatePath(
    "/dashboard/admin/returns"
  );

  revalidatePath(
    "/dashboard/seller/returns"
  );

  revalidatePath(
    "/dashboard/user/returns"
  );
}

/* ============================= */
/* REJECT RETURN */
/* ============================= */

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

  revalidatePath(
    "/dashboard/seller/returns"
  );

  revalidatePath(
    "/dashboard/admin/returns"
  );

  revalidatePath(
    "/dashboard/user/returns"
  );
}

/* ============================= */
/* COMPLETE RETURN */
/* ============================= */

export async function completeReturn(
  returnId: string
): Promise<void> {

  /* ============================= */
  /* FETCH RETURN */
  /* ============================= */

  const {
    data: returnData,
    error: returnError,
  } = await supabaseAdmin
    .from("returns")
    .select(`
      *,

      orders (
        *
      ),

      order_items (
        *
      )
    `)
    .eq("id", returnId)
    .single();

  if (
    returnError ||
    !returnData
  ) {

    console.log(
      "RETURN FETCH ERROR",
      returnError
    );

    throw new Error(
      "Return not found"
    );
  }

  /* ============================= */
  /* QC CHECK */
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
  /* UPDATE RETURN */
  /* IMPORTANT:
  /* UPDATE FIRST
  /* ============================= */

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("returns")
    .update({
      status: "completed",

      refund_released: true,

      refund_status:
        "processed",

      refund_processed_at:
        new Date().toISOString(),

      completed_at:
        new Date().toISOString(),
    })
    .eq("id", returnId);

  if (updateError) {

    console.log(
      "RETURN UPDATE ERROR",
      updateError
    );

    throw new Error(
      "Failed to complete return"
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
      status: "returned",
    })
    .eq(
      "id",
      returnData.order_item_id
    );

  if (itemError) {

    console.log(
      "ORDER ITEM UPDATE ERROR",
      itemError
    );
  }

  /* ============================= */
  /* UPDATE ORDER */
  /* ============================= */

  const {
    error: orderError,
  } = await supabaseAdmin
    .from("orders")
    .update({
      refund_amount:
        refundAmount,

      refund_status:
        "processed",
    })
    .eq(
      "id",
      returnData.order_id
    );

  if (orderError) {

    console.log(
      "ORDER UPDATE ERROR",
      orderError
    );
  }

  /* ============================= */
  /* CUSTOMER REFUND */
  /* IMPORTANT:
  /* NEVER BREAK FLOW
  /* ============================= */

  try {

    if (
      returnData.orders
        ?.payment_method ===
      "online"
    ) {

      console.log(
        "PROCESSING ONLINE REFUND"
      );

      const refundRes =
        await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/razorpay/refund`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              orderId:
                returnData.order_id,

              amount:
                refundAmount,
            }),
          }
        );

      const refundData =
        await refundRes.json();

      console.log(
        "RAZORPAY REFUND RESPONSE",
        refundData
      );

    } else {

      console.log(
        "COD REFUND REQUIRED"
      );

      /* ============================= */
      /* MANUAL COD REFUND */
      /* ============================= */
    }

  } catch (refundError) {

    console.log(
      "REFUND API ERROR"
    );

    console.log(
      refundError
    );

    /* IMPORTANT:
    /* DO NOT THROW ERROR
    /* RETURN SHOULD STILL COMPLETE
    */
  }

  /* ============================= */
  /* SELLER RECOVERY */
  /* ============================= */

  try {

    if (
      returnData.fault ===
        "seller" ||
      returnData.fault ===
        "platform"
    ) {

      console.log(
        "RECOVERING SELLER WALLET"
      );

      await refundSellerWallet({
        sellerId:
          returnData.seller_id,

        orderId:
          returnData.order_id,

        amount:
          refundAmount,
      });

      /* ============================= */
      /* WALLET TRANSACTION */
      /* ============================= */

      await supabaseAdmin
        .from(
          "wallet_transactions"
        )
        .insert({
          seller_id:
            returnData.seller_id,

          type: "debit",

          amount:
            refundAmount,

          reference_id:
            returnData.order_id,

          note:
            "Return refund recovered from seller",
        });
    }

  } catch (walletError) {

    console.log(
      "SELLER RECOVERY ERROR"
    );

    console.log(
      walletError
    );

    /* IMPORTANT:
    /* DO NOT BREAK RETURN FLOW
    */
  }

  /* ============================= */
  /* REVALIDATE */
  /* ============================= */

  revalidatePath(
    "/dashboard/admin/returns"
  );

  revalidatePath(
    "/dashboard/user/returns"
  );

  revalidatePath(
    "/dashboard/seller/returns"
  );

  revalidatePath(
    "/dashboard/user/orders"
  );

  revalidatePath(
    "/dashboard/seller/wallet"
  );

  console.log(
    "RETURN COMPLETED SUCCESSFULLY"
  );
}

/* ============================= */
/* QC PASS */
/* ============================= */

export async function passReturnQC(
  returnId: string,
  notes?: string
): Promise<void> {
  const {
    data: { user },
  } =
    await (
      await getSupabaseServer()
    ).auth.getUser();

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

  revalidatePath(
    "/dashboard/admin/returns"
  );

  revalidatePath(
    "/dashboard/seller/returns"
  );

  revalidatePath(
    "/dashboard/user/returns"
  );
}

/* ============================= */
/* QC FAIL */
/* ============================= */

export async function failReturnQC(
  returnId: string,
  notes?: string
): Promise<void> {
  const {
    data: { user },
  } =
    await (
      await getSupabaseServer()
    ).auth.getUser();

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

  revalidatePath(
    "/dashboard/admin/returns"
  );

  revalidatePath(
    "/dashboard/seller/returns"
  );

  revalidatePath(
    "/dashboard/user/returns"
  );
}

/* ============================= */
/* ADMIN APPROVE */
/* ============================= */

export async function adminApproveReturn(
  returnId: string
): Promise<void> {

  /* ============================= */
  /* FETCH RETURN */
  /* ============================= */

  const {
    data: returnData,
    error: returnError,
  } = await supabaseAdmin
    .from("returns")
    .select(`
      *,

      orders (
        *
      ),

      order_items (
        *
      ),

      users!returns_customer_id_fkey (
        *
      )
    `)
    .eq("id", returnId)
    .single();

  if (
    returnError ||
    !returnData
  ) {

    console.log(
      "RETURN FETCH ERROR",
      returnError
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
    error: addressError,
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
    addressError ||
    !customerAddress
  ) {

    console.log(
      "CUSTOMER ADDRESS ERROR",
      addressError
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

    console.log(
      "SELLER ERROR",
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

    console.log(
      "SELLER ADDRESS ERROR",
      sellerAddressError
    );

    throw new Error(
      "Seller pickup address not found"
    );
  }

  /* ============================= */
  /* DEBUG */
  /* ============================= */

  console.log(
    "SELLER DATA",
    seller
  );

  console.log(
    "SELLER ADDRESS",
    sellerAddress
  );

  /* ============================= */
  /* CREATE SHIPMENT */
  /* ============================= */

  let shipment;

  try {

    shipment =
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

    console.log(
      "RETURN SHIPMENT CREATED",
      shipment
    );

  } catch (error) {

    console.log(
      "SHIPROCKET RETURN ERROR"
    );

    console.log(error);

    throw new Error(
      "Failed to create reverse shipment"
    );
  }

  /* ============================= */
  /* UPDATE RETURN */
  /* ============================= */

  const {
    error: updateError,
  } = await supabaseAdmin
    .from("returns")
    .update({
      status: "approved",

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

      pickup_scheduled_at:
        new Date().toISOString(),
    })
    .eq("id", returnId);

  if (updateError) {

    console.log(
      "RETURN UPDATE ERROR",
      updateError
    );

    throw new Error(
      "Failed to update return"
    );
  }

  /* ============================= */
  /* UPDATE ORDER ITEM */
  /* ============================= */

  await supabaseAdmin
    .from("order_items")
    .update({
      status:
        "return_approved",
    })
    .eq(
      "id",
      returnData.order_item_id
    );

  /* ============================= */
  /* REVALIDATE */
  /* ============================= */

  revalidatePath(
    "/dashboard/admin/returns"
  );

  revalidatePath(
    "/dashboard/user/returns"
  );

  revalidatePath(
    "/dashboard/seller/returns"
  );

  revalidatePath(
    "/dashboard/user/orders"
  );
}
/* ============================= */
/* 🚚 RETURN PICKED UP */
/* ============================= */

export async function markReturnPickedUp(
  returnId: string
): Promise<void> {

  const {
    error,
  } = await supabaseAdmin
    .from("returns")
    .update({
      pickup_status:
        "picked_up",

      picked_up_at:
        new Date().toISOString(),
    })
    .eq("id", returnId);

  if (error) {

    console.log(
      "PICKUP UPDATE ERROR",
      error
    );

    throw new Error(
      "Failed to update pickup status"
    );
  }

  revalidatePath(
    "/dashboard/admin/returns"
  );

  revalidatePath(
    "/dashboard/user/returns"
  );

  revalidatePath(
    "/dashboard/seller/returns"
  );
}

/* ============================= */
/* 🚛 RETURN IN TRANSIT */
/* ============================= */

export async function markReturnInTransit(
  returnId: string
): Promise<void> {

  const {
    error,
  } = await supabaseAdmin
    .from("returns")
    .update({
      pickup_status:
        "in_transit",

      in_transit_at:
        new Date().toISOString(),
    })
    .eq("id", returnId);

  if (error) {

    console.log(
      "TRANSIT UPDATE ERROR",
      error
    );

    throw new Error(
      "Failed to update transit status"
    );
  }

  revalidatePath(
    "/dashboard/admin/returns"
  );

  revalidatePath(
    "/dashboard/user/returns"
  );

  revalidatePath(
    "/dashboard/seller/returns"
  );
}

/* ============================= */
/* 📦 RETURN DELIVERED */
/* ============================= */

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

  const {
    error,
  } = await supabaseAdmin
    .from("returns")
    .update({
      pickup_status:
        "delivered_to_seller",

      delivered_to_seller_at:
        new Date().toISOString(),
    })
    .eq("id", returnId);

  if (error) {

    console.log(
      "DELIVERY UPDATE ERROR",
      error
    );

    throw new Error(
      "Failed to mark delivered"
    );
  }

  /* ============================= */
  /* UPDATE ORDER ITEM */
  /* ============================= */

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

  revalidatePath(
    "/dashboard/admin/returns"
  );

  revalidatePath(
    "/dashboard/user/returns"
  );

  revalidatePath(
    "/dashboard/seller/returns"
  );
}
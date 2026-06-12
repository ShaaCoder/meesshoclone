import { supabaseAdmin } from "@/lib/supabase-admin";

const BASE_URL =
  "https://apiv2.shiprocket.in/v1/external";

let token: string | null = null;

let tokenExpiry: number | null =
  null;

/* ============================= */
/* 🔐 GET SHIPROCKET TOKEN */
/* ============================= */

export async function getShiprocketToken() {
  try {
    /* ============================= */
    /* ♻️ REUSE TOKEN */
    /* ============================= */

    if (
      token &&
      tokenExpiry &&
      Date.now() < tokenExpiry
    ) {
      return token;
    }

    /* ============================= */
    /* 🔑 LOGIN */
    /* ============================= */

    const res = await fetch(
      `${BASE_URL}/auth/login`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          email:
            process.env
              .SHIPROCKET_EMAIL,

          password:
            process.env
              .SHIPROCKET_PASSWORD,
        }),
      }
    );

    const data = await res.json();

    console.log(
      "SHIPROCKET LOGIN RESPONSE:",
      data
    );

    if (!res.ok || !data?.token) {
      throw new Error(
        data?.message ||
          "Shiprocket authentication failed"
      );
    }

    token = data.token;

    /* ============================= */
    /* ⏰ TOKEN EXPIRY */
    /* ============================= */

    tokenExpiry =
      Date.now() +
      23 * 60 * 60 * 1000;

    return token;
  } catch (error: any) {
    console.error(
      "TOKEN ERROR:",
      error
    );

    throw new Error(
      error?.message ||
        "Unable to authenticate Shiprocket"
    );
  }
}

/* ============================= */
/* 🏭 REGISTER PICKUP LOCATION */
/* ============================= */

export async function createPickupLocation(
  seller: any
) {
  try {
    const token =
      await getShiprocketToken();

    const pickupName =
      seller.shiprocket_pickup_name ||
      `SELLER-${seller.id.slice(0, 8)}`;

    const payload = {
      pickup_location:
        pickupName,

      name:
        seller.contact_person ||
        seller.name,

      email:
        seller.email,

      phone: String(
        seller.phone
      ).replace(/^0+/, ""),

      address:
        seller.address_line,

      address_2: "",

      city: String(
        seller.city
      )
        .split(",")[0]
        .trim(),

      state:
        seller.state,

      country: "India",

      pin_code: String(
        seller.pincode
      ),
    };

    console.log(
      "CREATE PICKUP PAYLOAD:",
      payload
    );

    const res = await fetch(
      `${BASE_URL}/settings/company/addpickup`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(
          payload
        ),
      }
    );

    const data = await res.json();

    console.log(
      "CREATE PICKUP RESPONSE:",
      data
    );

    if (
      data?.message?.includes(
        "already exists"
      )
    ) {
      return pickupName;
    }

    if (!res.ok) {
      throw new Error(
        data?.message ||
          "Failed to create pickup location"
      );
    }

    return pickupName;
  } catch (error: any) {
    console.error(
      "PICKUP LOCATION ERROR:",
      error
    );

    throw new Error(
      error?.message ||
        "Unable to create pickup location"
    );
  }
}

/* ============================= */
/* 📦 CREATE SHIPMENT */
/* ============================= */

export async function createShipment(
  payload: {
    order: any;
    customer: any;
    address: any;
    items: any[];
    seller: any;
  }
) {
  try {
    const {
      order,
      customer,
      address,
      items,
      seller,
    } = payload;

    /* ============================= */
    /* 🧪 DEV MODE */
    /* ============================= */

    if (
      process.env
        .SHIPROCKET_DEV_MODE ===
      "true"
    ) {
      console.log(
        "🧪 SHIPROCKET DEV MODE ENABLED"
      );

      const timestamp =
        Date.now();

      return {
        shipment_id:
          `DEV-SHIP-${timestamp}`,

        awb_code:
          `DEV-AWB-${timestamp}`,

        courier_name:
          "Development Courier",

        tracking_url:
          `https://example.com/tracking/dev-${timestamp}`,
      };
    }

    /* ============================= */
    /* 🔐 TOKEN */
    /* ============================= */

    const token =
      await getShiprocketToken();

    if (!token) {
      throw new Error(
        "Shiprocket token missing"
      );
    }

    /* ============================= */
    /* 🧠 VALIDATION */
    /* ============================= */

    if (
      !address?.name ||
      !address?.phone ||
      !address?.address_line ||
      !address?.city ||
      !address?.state ||
      !address?.pincode
    ) {
      throw new Error(
        "Incomplete customer address"
      );
    }

    if (
      !seller?.address_line ||
      !seller?.city ||
      !seller?.state ||
      !seller?.pincode
    ) {
      throw new Error(
        "Seller pickup address missing"
      );
    }

    /* ============================= */
    /* 🏭 PICKUP LOCATION */
    /* ============================= */

    const pickupLocation =
      await createPickupLocation(
        seller
      );

    /* ============================= */
    /* 👤 CUSTOMER NAME */
    /* ============================= */

    const nameParts = String(
      address.name || "Customer"
    )
      .trim()
      .split(" ");

    const firstName =
      nameParts[0] || "Customer";

    const lastName =
      nameParts
        .slice(1)
        .join(" ") || "User";

    const fullName = `${firstName} ${lastName}`;

    /* ============================= */
    /* 📦 ORDER ITEMS */
    /* ============================= */

    const orderItems =
      items.map((item: any) => ({
        name:
          item.product_name ||
          "Product",

        sku:
          item.product_id ||
          `SKU-${item.id}`,

        units: Number(
          item.quantity || 1
        ),

        selling_price: Number(
          item.final_price || 0
        ),
      }));

    /* ============================= */
    /* 📦 PACKAGE */
    /* ============================= */

    const totalWeight =
      Math.max(
        Number(items.length) * 0.5,
        0.5
      );

    /* ============================= */
    /* 🚚 SHIPMENT PAYLOAD */
    /* ============================= */

    const shipmentPayload = {
      order_id:
        order.order_code,

      order_date:
        new Date().toISOString(),

      pickup_location:
        pickupLocation,

      channel_id: "",

      comment:
        "Marketplace Order",

      reseller_name:
        "Marketplace",

      company_name:
        seller?.business_name ||
        seller?.name,

      /* ============================= */
      /* 👤 BILLING */
      /* ============================= */

      billing_customer_name:
        fullName,

      billing_last_name:
        "",

      billing_address:
        address.address_line,

      billing_address_2:
        "",

      billing_city: String(
        address.city
      )
        .split(",")[0]
        .trim(),

      billing_pincode:
        String(
          address.pincode
        ),

      billing_state:
        address.state,

      billing_country:
        "India",

      billing_email:
        customer.email,

      billing_phone: String(
        address.phone
      ).replace(/^0+/, ""),

      /* ============================= */
      /* 🚚 SHIPPING */
      /* ============================= */

      shipping_is_billing: true,

      /* ============================= */
      /* 📦 ITEMS */
      /* ============================= */

      order_items:
        orderItems,

      /* ============================= */
      /* 💳 PAYMENT */
      /* ============================= */

      payment_method:
        order.payment_method ===
        "cod"
          ? "COD"
          : "Prepaid",

      shipping_charges: 0,

      giftwrap_charges: 0,

      transaction_charges: 0,

      total_discount: 0,

      sub_total: Number(
        order.total_amount || 0
      ),

      /* ============================= */
      /* 📐 PACKAGE */
      /* ============================= */

      length: 10,

      breadth: 10,

      height: 10,

      weight: totalWeight,
    };

    console.log(
      "SHIPMENT PAYLOAD:",
      shipmentPayload
    );

    /* ============================= */
    /* 📡 CREATE SHIPMENT */
    /* ============================= */

    const res = await fetch(
      `${BASE_URL}/orders/create/adhoc`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(
          shipmentPayload
        ),
      }
    );

    const data = await res.json();

    console.log(
      "SHIPROCKET CREATE RESPONSE:",
      data
    );

    if (
      !res.ok ||
      data?.status === false ||
      data?.status_code >= 400
    ) {
      throw new Error(
        data?.message ||
          JSON.stringify(
            data?.errors
          ) ||
          "Shiprocket shipment failed"
      );
    }

    /* ============================= */
    /* 📦 SHIPMENT ID */
    /* ============================= */

    const shipmentId =
      data?.shipment_id ||
      data?.shipment_details
        ?.shipment_id;

    if (!shipmentId) {
      throw new Error(
        "Shipment ID missing from Shiprocket response"
      );
    }

    /* ============================= */
    /* 🚛 ASSIGN COURIER */
    /* ============================= */

    let courier: any = null;

    try {
      courier =
        await assignCourier(
          shipmentId
        );
    } catch (err) {
      console.error(
        "COURIER ERROR:",
        err
      );
    }

    /* ============================= */
    /* 💾 SAVE SHIPMENT */
    /* ============================= */

    await supabaseAdmin
      .from("shipments")
      .insert({
        order_id: order.id,

        seller_id:
          order.seller_id,

        shipment_id:
          String(shipmentId),

        awb_code:
          courier?.awb_code ||
          null,

        courier_name:
          courier?.courier_name ||
          null,

        tracking_url:
          courier?.tracking_url ||
          null,

        status: "created",
      });

    /* ============================= */
    /* ✅ SUCCESS */
    /* ============================= */

    return {
      shipment_id:
        shipmentId,

      awb_code:
        courier?.awb_code ||
        null,

      courier_name:
        courier?.courier_name ||
        "Pending",

      tracking_url:
        courier?.tracking_url ||
        null,
    };
  } catch (error: any) {
    console.error(
      "SHIPMENT ERROR:",
      error
    );

    throw new Error(
      error?.message ||
        "Shipment creation failed"
    );
  }
}

/* ============================= */
/* 🚛 ASSIGN COURIER */
/* ============================= */

export async function assignCourier(
  shipmentId: number
) {
  try {
    const token =
      await getShiprocketToken();

    if (!shipmentId) {
      throw new Error(
        "Shipment ID missing"
      );
    }

    const res = await fetch(
      `${BASE_URL}/courier/assign/awb`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          shipment_id:
            shipmentId,
        }),
      }
    );

    const data =
      await res.json();

    console.log(
      "COURIER ASSIGN RESPONSE:",
      data
    );

    if (
      res.ok &&
      data?.awb_code
    ) {
      return {
        awb_code:
          data.awb_code,

        courier_name:
          data.courier_name,

        tracking_url:
          `https://shiprocket.co/tracking/${data.awb_code}`,
      };
    }

    console.log(
      "USING FAKE COURIER DATA"
    );

    return {
      awb_code:
        `FAKE-AWB-${shipmentId}`,

      courier_name:
        "Shiprocket Sandbox",

      tracking_url:
        `https://shiprocket.co/tracking/demo-${shipmentId}`,
    };
  } catch (error: any) {
    console.error(
      "ASSIGN COURIER ERROR:",
      error
    );

    return {
      awb_code:
        `FAKE-AWB-${shipmentId}`,

      courier_name:
        "Shiprocket Sandbox",

      tracking_url:
        `https://shiprocket.co/tracking/demo-${shipmentId}`,
    };
  }
}

/* ============================= */
/* 📍 GET SELLER PICKUP ADDRESS */
/* ============================= */

export async function getSellerPickupAddress(
  sellerId: string
) {
  const { data, error } =
    await supabaseAdmin
      .from("seller_addresses")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("is_default", true)
      .single();

  if (error || !data) {
    throw new Error(
      "Seller pickup address not found"
    );
  }

  return data;
}

/* ============================= */
/* 🔁 CREATE RETURN SHIPMENT */
/* ============================= */

export async function createReturnShipment(
  payload: {
    returnData: any;
    order: any;
    customer: any;
    customerAddress: any;
    seller: any;
    sellerAddress: any;
    orderItem: any;
  }
) {
  try {
    const {
      returnData,
      order,
      customer,
      customerAddress,
      seller,
      sellerAddress,
      orderItem,
    } = payload;

    /* ============================= */
    /* 🧪 DEV MODE */
    /* ============================= */

    if (
      process.env
        .SHIPROCKET_DEV_MODE ===
      "true"
    ) {
      const timestamp =
        Date.now();

      return {
        shipment_id:
          `DEV-RETURN-${timestamp}`,

        awb_code:
          `DEV-RETURN-AWB-${timestamp}`,

        courier_name:
          "Development Return Courier",

        tracking_url:
          `https://example.com/returns/${timestamp}`,
      };
    }

    /* ============================= */
    /* 🔐 TOKEN */
    /* ============================= */

    const token =
      await getShiprocketToken();

    if (!token) {
      throw new Error(
        "Shiprocket token missing"
      );
    }

    /* ============================= */
    /* 🏭 PICKUP LOCATION */
    /* ============================= */

    const pickupLocation =
      await createPickupLocation(
        {
          ...seller,

          address_line:
            sellerAddress.address_line,

          city:
            sellerAddress.city,

          state:
            sellerAddress.state,

          pincode:
            sellerAddress.pincode,
        }
      );

    /* ============================= */
    /* 👤 CUSTOMER NAME */
    /* ============================= */

    const nameParts = String(
      customerAddress.name ||
        "Customer"
    )
      .trim()
      .split(" ");

    const firstName =
      nameParts[0] || "Customer";

    const lastName =
      nameParts
        .slice(1)
        .join(" ") || "User";

    /* ============================= */
    /* 📦 RETURN PAYLOAD */
    /* ============================= */

    const shipmentPayload = {
      order_id:
        `RETURN-${order.order_code}`,

      order_date:
        new Date().toISOString(),

      pickup_location:
        pickupLocation,

      pickup_customer_name:
        `${firstName} ${lastName}`,

      pickup_address:
        customerAddress.address_line,

      pickup_city: String(
        customerAddress.city
      )
        .split(",")[0]
        .trim(),

      pickup_state:
        customerAddress.state,

      pickup_country:
        "India",

      pickup_pincode:
        String(
          customerAddress.pincode
        ),

      pickup_phone: String(
        customerAddress.phone
      ).replace(/^0+/, ""),

      pickup_email:
        customer.email,

      shipping_customer_name:
        seller.contact_person ||
        seller.name,

      shipping_address:
        sellerAddress.address_line,

      shipping_city: String(
        sellerAddress.city
      )
        .split(",")[0]
        .trim(),

      shipping_state:
        sellerAddress.state,

      shipping_country:
        "India",

      shipping_pincode:
        String(
          sellerAddress.pincode
        ),

      shipping_phone: String(
        seller.phone
      ).replace(/^0+/, ""),

      shipping_email:
        seller.email,

      order_items: [
        {
          name:
            orderItem.product_name ||
            "Returned Product",

          sku:
            orderItem.product_id ||
            orderItem.id,

          units: Number(
            orderItem.quantity || 1
          ),

          selling_price: Number(
            orderItem.final_price || 0
          ),
        },
      ],

      payment_method:
        "Prepaid",

      sub_total: Number(
        orderItem.final_price || 0
      ),

      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
    };

    console.log(
      "RETURN SHIPMENT PAYLOAD:",
      shipmentPayload
    );

    const res = await fetch(
      `${BASE_URL}/orders/create/return`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify(
          shipmentPayload
        ),
      }
    );

    const data = await res.json();

    console.log(
      "RETURN SHIPMENT RESPONSE:",
      data
    );

    if (
      !res.ok ||
      data?.status === false ||
      data?.status_code >= 400
    ) {
      throw new Error(
        data?.message ||
          JSON.stringify(
            data
          ) ||
          "Return shipment failed"
      );
    }

    const shipmentId =
      data?.shipment_id ||
      data?.shipment_details
        ?.shipment_id;

    if (!shipmentId) {
      throw new Error(
        "Return shipment id missing"
      );
    }

    let courier: any = null;

    try {
      courier =
        await assignCourier(
          shipmentId
        );
    } catch (err) {
      console.error(
        "RETURN COURIER ERROR:",
        err
      );
    }

    return {
      shipment_id:
        shipmentId,

      awb_code:
        courier?.awb_code ||
        null,

      courier_name:
        courier?.courier_name ||
        "Pending",

      tracking_url:
        courier?.tracking_url ||
        null,
    };
  } catch (error: any) {
    console.error(
      "RETURN SHIPMENT ERROR:",
      error
    );

    throw new Error(
      error?.message ||
        "Return shipment failed"
    );
  }
}
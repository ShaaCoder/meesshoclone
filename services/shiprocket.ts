const BASE_URL = "https://apiv2.shiprocket.in/v1/external";

let token: string | null = null;
let tokenExpiry: number | null = null;

/* ============================= */
/* 🔐 GET TOKEN */
/* ============================= */
export async function getShiprocketToken() {
  try {
    // ✅ reuse valid token
    if (token && tokenExpiry && Date.now() < tokenExpiry) {
      return token;
    }

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }),
    });

    const data = await res.json();

    console.log("SHIPROCKET LOGIN RESPONSE:", data);

    if (!data?.token) {
      throw new Error(
        data?.message || "Shiprocket authentication failed"
      );
    }

    token = data.token;

    // ✅ token expiry (24h safe)
    tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

    return token;
  } catch (error: any) {
    console.error("TOKEN ERROR:", error.message);
    throw new Error("Unable to authenticate Shiprocket");
  }
}

/* ============================= */
/* 📦 CREATE SHIPMENT */
/* ============================= */
export async function createShipment(order: any) {
  try {
    const token = await getShiprocketToken();

    if (!token) {
      throw new Error("Token missing");
    }

    console.log("USING TOKEN:", token.slice(0, 20));

    /* ============================= */
    /* 🧠 NAME SPLIT FIX */
    /* ============================= */
    const nameParts = (order.name || "").trim().split(" ");
const firstName = nameParts[0] || "Customer";
const lastName = nameParts.slice(1).join(" ") || "User";
const fullName = `${firstName} ${lastName}`;

    /* ============================= */
    /* 📦 API CALL */
    /* ============================= */
    const res = await fetch(`${BASE_URL}/orders/create/adhoc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
     body: JSON.stringify({
  order_id: order.order_code,
  order_date: new Date().toISOString(),

  // ✅ SEND BOTH (IMPORTANT FIX)
  billing_customer_name: fullName,
  billing_first_name: firstName,
  billing_last_name: lastName,

  billing_phone: order.phone,
  billing_address: order.address,
  billing_city: order.city,
  billing_pincode: String(order.pincode),
  billing_state: order.state,
  billing_country: "India",

  shipping_is_billing: true,

  order_items: [
    {
      name: "Product",
      sku: "SKU1",
      units: 1,
      selling_price: Number(order.total_amount),
    },
  ],

  payment_method:
    order.payment_method === "cod" ? "COD" : "Prepaid",

  sub_total: Number(order.total_amount),

  length: 10,
  breadth: 10,
  height: 10,
  weight: 0.5,
})
    });


    const data = await res.json();

    console.log("SHIPROCKET CREATE RESPONSE:", data);

    /* ============================= */
    /* ❌ ERROR HANDLING */
    /* ============================= */
    if (!res.ok || data?.status === false || data?.status_code >= 400) {
      throw new Error(
        data?.message ||
          JSON.stringify(data?.errors) ||
          "Shiprocket shipment failed"
      );
    }

    /* ============================= */
    /* ✅ SUCCESS RESPONSE */
    /* ============================= */
    return {
      shipment_id: data?.shipment_id,
      awb_code: data?.awb_code,
      courier_name: data?.courier_name,
      tracking_url:
        data?.tracking_url ||
        `https://shiprocket.co/tracking/${data?.awb_code}`,
    };
  } catch (error: any) {
    console.error("SHIPMENT ERROR:", error.message);

    throw new Error(
      error.message || "Shipment creation failed"
    );
  }
}
// AWb
export async function assignCourier(shipmentId: number) {
  const token = await getShiprocketToken();

  const res = await fetch(
    `${BASE_URL}/courier/assign/awb`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shipment_id: shipmentId,
      }),
    }
  );

  const data = await res.json();

  console.log("COURIER ASSIGN RESPONSE:", data);

  if (!data?.awb_code) {
    throw new Error("Courier assignment failed");
  }

  return {
    awb_code: data.awb_code,
    courier_name: data.courier_name,
  };
}
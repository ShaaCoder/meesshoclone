/* ============================= */
/* 💰 MARKETPLACE PRICING */
/* ============================= */

export function calculatePrice({
  cost_price,
  margin_percent,
}: {
  cost_price: number;
  margin_percent: number;
}) {
  /* ============================= */
  /* VALIDATION */
  /* ============================= */

  const cost =
    Number(cost_price || 0);

  const margin =
    Number(
      margin_percent || 0
    );

  /* ============================= */
  /* PLATFORM MARGIN */
  /* ============================= */

  const platform_margin =
    Math.round(
      (cost * margin) / 100
    );

  /* ============================= */
  /* SELLING PRICE */
  /* ============================= */

  const selling_price =
    cost + platform_margin;

  /* ============================= */
  /* SELLER PROFIT */
  /* ============================= */

  // REAL MARKETPLACE MODEL:
  // Seller profit is:
  // selling - cost - platform fee

  const seller_profit =
    selling_price -
    cost -
    platform_margin;

  return {
    selling_price,

    platform_margin,

    seller_profit,
  };
}

/* ============================= */
/* 🛒 GET VARIANT SELLING PRICE */
/* ============================= */

export function getVariantSellingPrice(
  input: {
    cost_price?: number | null;

    selling_price?:
      | number
      | null;

    margin_percent: number;
  }
) {
  /* ============================= */
  /* USE STORED PRICE */
  /* ============================= */

  const stored =
    Number(
      input.selling_price ||
        0
    );

  if (stored > 0) {
    return stored;
  }

  /* ============================= */
  /* FALLBACK CALCULATION */
  /* ============================= */

  const cost = Number(
    input.cost_price || 0
  );

  if (cost <= 0) {
    return 0;
  }

  return calculatePrice({
    cost_price: cost,

    margin_percent:
      input.margin_percent,
  }).selling_price;
}
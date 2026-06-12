/* =========================================================
   🧠 PRICING ENGINE
   FILE: services/pricing-engine.ts
   ========================================================= */

export interface PricingItem {


  quantity: number;

  costPrice: number;

  platformMargin?: number;

  sellerShippingFee?: number;

  adminShippingFee?: number;

  gstPercent?: number;

  discount?: number;

  couponDiscount?: number;
}

export interface PricingResult {
  quantity: number;

  itemSubtotal: number;

  gstAmount: number;

  shippingFee: number;

  sellerShippingFee: number;

  adminShippingFee: number;

  platformFee: number;

  sellerEarning: number;

  adminProfit: number;

  discount: number;

  couponDiscount: number;

  finalSellingPrice: number;
}

/* =========================================================
   🧠 HELPERS
   ========================================================= */

function round(value: number) {
  return Number(value.toFixed(2));
}

/* =========================================================
   🧠 CALCULATE SINGLE PRODUCT PRICE
   ========================================================= */

export function calculateItemPricing(
  item: PricingItem
): PricingResult {
  const quantity = Number(item.quantity || 1);

  const costPrice = Number(item.costPrice || 0);

  const platformMargin = Number(
    item.platformMargin || 0
  );

  const sellerShippingFee = Number(
    item.sellerShippingFee || 0
  );

  const adminShippingFee = Number(
    item.adminShippingFee || 0
  );

  const gstPercent = Number(item.gstPercent || 0);

  const discount = Number(item.discount || 0);

  const couponDiscount = Number(
    item.couponDiscount || 0
  );

  /* =========================================================
     BASE SELLING PRICE
     ========================================================= */

  const baseSellingPrice =
    costPrice + platformMargin;

  /* =========================================================
     ITEM SUBTOTAL
     ========================================================= */

  const itemSubtotal =
    baseSellingPrice * quantity;

  /* =========================================================
     GST
     ========================================================= */

  const gstAmount =
    (itemSubtotal * gstPercent) / 100;

  /* =========================================================
     SHIPPING
     ========================================================= */

  const shippingFee =
    sellerShippingFee + adminShippingFee;

  /* =========================================================
     FINAL PRICE BEFORE DISCOUNTS
     ========================================================= */

  const totalBeforeDiscount =
    itemSubtotal + gstAmount + shippingFee;

  /* =========================================================
     TOTAL DISCOUNTS
     ========================================================= */

  const totalDiscount =
    discount + couponDiscount;

  /* =========================================================
     FINAL CUSTOMER PRICE
     ========================================================= */

  const finalSellingPrice =
    totalBeforeDiscount - totalDiscount;

  /* =========================================================
     SELLER EARNING
     ========================================================= */

  const sellerEarning =
    (costPrice * quantity) + sellerShippingFee;

  /* =========================================================
     ADMIN PROFIT
     ========================================================= */

  const adminProfit =
    (platformMargin * quantity) +
    adminShippingFee;

  return {
    quantity,

    itemSubtotal: round(itemSubtotal),

    gstAmount: round(gstAmount),

    shippingFee: round(shippingFee),

    sellerShippingFee: round(
      sellerShippingFee
    ),

    adminShippingFee: round(
      adminShippingFee
    ),

    platformFee: round(
      platformMargin * quantity
    ),

    sellerEarning: round(sellerEarning),

    adminProfit: round(adminProfit),

    discount: round(discount),

    couponDiscount: round(
      couponDiscount
    ),

    finalSellingPrice: round(
      finalSellingPrice
    ),
  };
}

/* =========================================================
   🧠 MULTI ITEM CART CALCULATION
   ========================================================= */

export function calculateCartPricing(
  items: PricingItem[]
) {
  const calculatedItems = items.map((item) =>
    calculateItemPricing(item)
  );

  const summary = calculatedItems.reduce(
    (acc, item) => {
      acc.totalItems += item.quantity;

      acc.subtotal += item.itemSubtotal;

      acc.gst += item.gstAmount;

      acc.shipping += item.shippingFee;

      acc.platformFee += item.platformFee;

      acc.sellerEarnings +=
        item.sellerEarning;

      acc.adminProfit += item.adminProfit;

      acc.discount += item.discount;

      acc.couponDiscount +=
        item.couponDiscount;

      acc.grandTotal +=
        item.finalSellingPrice;

      return acc;
    },
    {
      totalItems: 0,

      subtotal: 0,

      gst: 0,

      shipping: 0,

      platformFee: 0,

      sellerEarnings: 0,

      adminProfit: 0,

      discount: 0,

      couponDiscount: 0,

      grandTotal: 0,
    }
  );

  return {
    items: calculatedItems,

    summary: {
      totalItems: summary.totalItems,

      subtotal: round(summary.subtotal),

      gst: round(summary.gst),

      shipping: round(summary.shipping),

      platformFee: round(
        summary.platformFee
      ),

      sellerEarnings: round(
        summary.sellerEarnings
      ),

      adminProfit: round(
        summary.adminProfit
      ),

      discount: round(summary.discount),

      couponDiscount: round(
        summary.couponDiscount
      ),

      grandTotal: round(
        summary.grandTotal
      ),
    },
  };
}

/* =========================================================
   🧠 SETTLEMENT CALCULATOR
   ========================================================= */

export function calculateSettlementAmount(
  sellerEarning: number,
  refundAmount: number = 0,
  penaltyAmount: number = 0
) {
  const settlement =
    sellerEarning -
    refundAmount -
    penaltyAmount;

  return round(Math.max(settlement, 0));
}

/* =========================================================
   🧠 PROFIT CALCULATOR
   ========================================================= */

export function calculatePlatformProfit(
  revenue: number,
  expenses: number
) {
  return round(revenue - expenses);
}

/* =========================================================
   🧠 RETURN LOSS CALCULATOR
   ========================================================= */

export function calculateReturnLoss({
  shippingLoss = 0,
  refundAmount = 0,
  recoveryAmount = 0,
}: {
  shippingLoss?: number;

  refundAmount?: number;

  recoveryAmount?: number;
}) {
  const loss =
    shippingLoss +
    refundAmount -
    recoveryAmount;

  return round(loss);
}
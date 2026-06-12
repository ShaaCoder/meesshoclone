/* =========================================================
   🧠 COMMISSION ENGINE
   FILE: services/commission-engine.ts
   ========================================================= */

export type ProductCategory =
  | "fashion"
  | "electronics"
  | "beauty"
  | "books"
  | "grocery"
  | "furniture"
  | "sports"
  | "other";

export type SellerType =
  | "basic"
  | "premium"
  | "enterprise";

export interface CommissionInput {
  category: ProductCategory;

  sellerType?: SellerType;

  productPrice: number;

  quantity?: number;

  isReturn?: boolean;

  seasonalBoost?: number;

  customCommissionRate?: number;
}

export interface CommissionResult {
  categoryCommissionRate: number;

  sellerCommissionRate: number;

  finalCommissionRate: number;

  totalCommission: number;

  commissionPerItem: number;

  returnPenalty: number;

  netPlatformRevenue: number;
}

/* =========================================================
   🧠 DEFAULT CATEGORY COMMISSIONS
   ========================================================= */

const CATEGORY_COMMISSIONS: Record<
  ProductCategory,
  number
> = {
  fashion: 18,

  electronics: 8,

  beauty: 15,

  books: 5,

  grocery: 6,

  furniture: 12,

  sports: 10,

  other: 10,
};

/* =========================================================
   🧠 SELLER TYPE MODIFIERS
   ========================================================= */

const SELLER_TYPE_MODIFIER: Record<
  SellerType,
  number
> = {
  basic: 0,

  premium: -2,

  enterprise: -4,
};

/* =========================================================
   🧠 RETURN PENALTY %
   ========================================================= */

const RETURN_PENALTY_PERCENT = 5;

/* =========================================================
   🧠 HELPERS
   ========================================================= */

function round(value: number) {
  return Number(value.toFixed(2));
}

/* =========================================================
   🧠 GET CATEGORY COMMISSION
   ========================================================= */

export function getCategoryCommission(
  category: ProductCategory
) {
  return CATEGORY_COMMISSIONS[category] || 10;
}

/* =========================================================
   🧠 GET SELLER MODIFIER
   ========================================================= */

export function getSellerCommissionModifier(
  sellerType: SellerType = "basic"
) {
  return SELLER_TYPE_MODIFIER[sellerType] || 0;
}

/* =========================================================
   🧠 CALCULATE COMMISSION
   ========================================================= */

export function calculateCommission({
  category,
  sellerType = "basic",
  productPrice,
  quantity = 1,
  isReturn = false,
  seasonalBoost = 0,
  customCommissionRate,
}: CommissionInput): CommissionResult {
  /* =========================================================
     CATEGORY RATE
     ========================================================= */

  const categoryCommissionRate =
    customCommissionRate ??
    getCategoryCommission(category);

  /* =========================================================
     SELLER MODIFIER
     ========================================================= */

  const sellerCommissionRate =
    getSellerCommissionModifier(sellerType);

  /* =========================================================
     FINAL RATE
     ========================================================= */

  const finalCommissionRate =
    categoryCommissionRate +
    sellerCommissionRate +
    seasonalBoost;

  /* =========================================================
     PRODUCT TOTAL
     ========================================================= */

  const totalProductPrice =
    productPrice * quantity;

  /* =========================================================
     COMMISSION
     ========================================================= */

  const totalCommission =
    (totalProductPrice *
      finalCommissionRate) /
    100;

  /* =========================================================
     COMMISSION PER ITEM
     ========================================================= */

  const commissionPerItem =
    totalCommission / quantity;

  /* =========================================================
     RETURN PENALTY
     ========================================================= */

  const returnPenalty = isReturn
    ? (totalProductPrice *
        RETURN_PENALTY_PERCENT) /
      100
    : 0;

  /* =========================================================
     NET PLATFORM REVENUE
     ========================================================= */

  const netPlatformRevenue =
    totalCommission - returnPenalty;

  return {
    categoryCommissionRate: round(
      categoryCommissionRate
    ),

    sellerCommissionRate: round(
      sellerCommissionRate
    ),

    finalCommissionRate: round(
      finalCommissionRate
    ),

    totalCommission: round(
      totalCommission
    ),

    commissionPerItem: round(
      commissionPerItem
    ),

    returnPenalty: round(
      returnPenalty
    ),

    netPlatformRevenue: round(
      netPlatformRevenue
    ),
  };
}

/* =========================================================
   🧠 CALCULATE SELLER PAYOUT
   ========================================================= */

export function calculateSellerPayout({
  orderAmount,
  commissionAmount,
  shippingFee = 0,
  gstAmount = 0,
  penalties = 0,
}: {
  orderAmount: number;

  commissionAmount: number;

  shippingFee?: number;

  gstAmount?: number;

  penalties?: number;
}) {
  const payout =
    orderAmount -
    commissionAmount -
    gstAmount -
    penalties +
    shippingFee;

  return round(Math.max(payout, 0));
}

/* =========================================================
   🧠 CALCULATE PLATFORM REVENUE
   ========================================================= */

export function calculatePlatformRevenue({
  commission,
  shippingRevenue = 0,
  adsRevenue = 0,
  penalties = 0,
}: {
  commission: number;

  shippingRevenue?: number;

  adsRevenue?: number;

  penalties?: number;
}) {
  const revenue =
    commission +
    shippingRevenue +
    adsRevenue +
    penalties;

  return round(revenue);
}

/* =========================================================
   🧠 DYNAMIC COMMISSION ENGINE
   ========================================================= */

export function getDynamicCommissionRate({
  category,
  sellerOrders = 0,
  sellerRating = 0,
}: {
  category: ProductCategory;

  sellerOrders?: number;

  sellerRating?: number;
}) {
  let rate =
    getCategoryCommission(category);

  /* =========================================================
     HIGH VOLUME SELLERS
     ========================================================= */

  if (sellerOrders > 1000) {
    rate -= 2;
  }

  if (sellerOrders > 5000) {
    rate -= 3;
  }

  /* =========================================================
     HIGH RATED SELLERS
     ========================================================= */

  if (sellerRating >= 4.5) {
    rate -= 1;
  }

  if (sellerRating >= 4.8) {
    rate -= 2;
  }

  return round(Math.max(rate, 1));
}

/* =========================================================
   🧠 RETURN PENALTY CALCULATOR
   ========================================================= */

export function calculateReturnPenalty({
  orderAmount,
  returnRate,
}: {
  orderAmount: number;

  returnRate: number;
}) {
  const penalty =
    (orderAmount * returnRate) / 100;

  return round(penalty);
}

/* =========================================================
   🧠 FESTIVAL / SALE BOOST
   ========================================================= */

export function applyFestivalCommissionBoost(
  baseCommission: number,
  boostPercent: number
) {
  return round(
    baseCommission + boostPercent
  );
}

/* =========================================================
   🧠 BULK ORDER COMMISSION DISCOUNT
   ========================================================= */

export function getBulkOrderCommissionDiscount(
  quantity: number
) {
  if (quantity >= 100) return 5;

  if (quantity >= 50) return 3;

  if (quantity >= 20) return 2;

  return 0;
}
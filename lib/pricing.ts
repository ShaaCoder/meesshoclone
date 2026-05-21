export function calculatePrice({
  cost_price,
  margin_percent,
}: {
  cost_price: number;
  margin_percent: number;
}) {
  // Marketplace rule: selling price is variant-based.
  // price = cost_price + platform_margin
  const platform_margin = Math.round((cost_price * margin_percent) / 100);

  // Keep seller profit separate for wallet/accounting flows
  // (do not include in customer selling price).
  const seller_profit = 0;

  const selling_price = cost_price + platform_margin;

  return { selling_price, platform_margin, seller_profit };
}

export function getVariantSellingPrice(input: {
  cost_price?: number | null;
  selling_price?: number | null;
  margin_percent: number;
}) {
  const stored = Number(input.selling_price || 0);
  if (stored > 0) return stored;
  const cost = Number(input.cost_price || 0);
  if (cost <= 0) return 0;
  return calculatePrice({
    cost_price: cost,
    margin_percent: input.margin_percent,
  }).selling_price;
}
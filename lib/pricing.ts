export function calculatePrice(variant: any) {
  const cost = Number(variant.cost_price || 0);
  const margin = Number(variant.platform_margin || 50); // 👈 default margin

  const selling = cost + margin;

  return {
    cost,
    margin,
    selling,
    profit: margin,
  };
}
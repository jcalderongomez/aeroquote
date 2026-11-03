import Decimal from "decimal.js";

Decimal.set({ precision: 24, rounding: Decimal.ROUND_HALF_UP });

export type QuoteCalculationInput = {
  items: Array<{
    quantity: string | number;
    unitPrice: string | number;
    discountPercent?: string | number;
  }>;
  costs: Array<string | number>;
  taxRate: string | number;
};

export type QuoteCalculation = {
  subtotal: string;
  discount: string;
  taxAmount: string;
  total: string;
  internalCosts: string;
  estimatedProfit: string;
  marginPercent: string;
  itemTotals: string[];
};

const money = (value: Decimal) => value.toDecimalPlaces(2).toFixed(2);
const MAX_MONEY = new Decimal("999999999999.99");

export function calculateQuote(input: QuoteCalculationInput): QuoteCalculation {
  const items = input.items.map((item) => {
    const quantity = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    const discountPercent = new Decimal(item.discountPercent ?? 0);

    if (!quantity.isFinite() || quantity.lte(0)) throw new Error("La cantidad debe ser mayor que cero.");
    if (!unitPrice.isFinite() || unitPrice.lt(0)) throw new Error("El precio no puede ser negativo.");
    if (!discountPercent.isFinite() || discountPercent.lt(0) || discountPercent.gt(100)) {
      throw new Error("El descuento debe estar entre 0 y 100 por ciento.");
    }

    const gross = quantity.mul(unitPrice);
    if (gross.gt(MAX_MONEY)) throw new Error("El valor de una línea supera el máximo permitido.");
    const lineDiscount = gross.mul(discountPercent).div(100).toDecimalPlaces(2);
    return { gross: gross.toDecimalPlaces(2), total: gross.minus(lineDiscount).toDecimalPlaces(2), discount: lineDiscount };
  });
  const costs = input.costs.map((amount) => new Decimal(amount));
  const taxRate = new Decimal(input.taxRate);

  if (!taxRate.isFinite() || taxRate.lt(0) || taxRate.gt(100)) {
    throw new Error("El impuesto debe estar entre 0 y 100 por ciento.");
  }
  if (costs.some((amount) => !amount.isFinite() || amount.lt(0))) {
    throw new Error("Los costos no pueden ser negativos.");
  }

  const subtotal = Decimal.sum(new Decimal(0), ...items.map((item) => item.gross)).toDecimalPlaces(2);
  if (subtotal.gt(MAX_MONEY)) throw new Error("El subtotal supera el máximo permitido.");
  const discount = Decimal.sum(new Decimal(0), ...items.map((item) => item.discount)).toDecimalPlaces(2);
  const taxableSubtotal = Decimal.sum(new Decimal(0), ...items.map((item) => item.total)).toDecimalPlaces(2);
  const taxAmount = taxableSubtotal.mul(taxRate).div(100).toDecimalPlaces(2);
  const total = taxableSubtotal.plus(taxAmount).toDecimalPlaces(2);
  const internalCosts = Decimal.sum(new Decimal(0), ...costs).toDecimalPlaces(2);
  if (taxAmount.gt(MAX_MONEY) || total.gt(MAX_MONEY) || internalCosts.gt(MAX_MONEY)) {
    throw new Error("El total o los costos superan el máximo permitido.");
  }
  const estimatedProfit = taxableSubtotal.minus(internalCosts).toDecimalPlaces(2);
  const marginPercent = taxableSubtotal.isZero()
    ? new Decimal(0)
    : estimatedProfit.div(taxableSubtotal).mul(100).toDecimalPlaces(2);

  return {
    subtotal: money(subtotal),
    discount: money(discount),
    taxAmount: money(taxAmount),
    total: money(total),
    internalCosts: money(internalCosts),
    estimatedProfit: money(estimatedProfit),
    marginPercent: money(marginPercent),
    itemTotals: items.map((item) => money(item.total)),
  };
}

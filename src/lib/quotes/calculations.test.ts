import { describe, expect, it } from "vitest";
import { calculateQuote } from "./calculations";

describe("calculateQuote", () => {
  it("calculates discounted lines, configurable tax, and internal margin with decimal precision", () => {
    expect(
      calculateQuote({
        items: [
          { quantity: "3", unitPrice: "1000.10", discountPercent: "10" },
          { quantity: "1", unitPrice: "500.05" },
        ],
        costs: ["1200.20", "99.80"],
        taxRate: "19",
      }),
    ).toEqual({
      subtotal: "3500.35",
      discount: "300.03",
      taxAmount: "608.06",
      total: "3808.38",
      internalCosts: "1300.00",
      estimatedProfit: "1900.32",
      marginPercent: "59.38",
      itemTotals: ["2700.27", "500.05"],
    });
  });

  it("rejects invalid quantities, discounts, taxes, and costs", () => {
    expect(() => calculateQuote({ items: [{ quantity: 0, unitPrice: 1 }], costs: [], taxRate: 0 })).toThrow();
    expect(() => calculateQuote({ items: [{ quantity: 1, unitPrice: 1, discountPercent: 101 }], costs: [], taxRate: 0 })).toThrow();
    expect(() => calculateQuote({ items: [], costs: [-1], taxRate: 0 })).toThrow();
    expect(() => calculateQuote({ items: [], costs: [], taxRate: 101 })).toThrow();
    expect(() => calculateQuote({ items: [{ quantity: "100000000", unitPrice: "1000000000000" }], costs: [], taxRate: 0 })).toThrow();
  });

  it("keeps the gross subtotal, discounts, and taxable total consistent when a line is free", () => {
    expect(
      calculateQuote({
        items: [
          { quantity: "2", unitPrice: "100", discountPercent: "25" },
          { quantity: "1", unitPrice: "0", discountPercent: "0" },
        ],
        costs: [],
        taxRate: "19",
      }),
    ).toMatchObject({
      subtotal: "200.00",
      discount: "50.00",
      taxAmount: "28.50",
      total: "178.50",
      itemTotals: ["150.00", "0.00"],
    });
  });
});

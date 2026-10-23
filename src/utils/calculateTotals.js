"use strict";

/**
 * Utility to calculate total cash and gpay from entry cash/gpay component arrays.
 * Compatible with flex.cash and flex.gpay schemas.
 */
module.exports = (entries = []) => {
  let cash = 0;
  let gpay = 0;

  if (!Array.isArray(entries)) {
    return { cash, gpay };
  }

  for (const entry of entries) {
    if (Array.isArray(entry.cash)) {
      for (const c of entry.cash) {
        cash += Number(c.amount || c.cash_amount || 0);
      }
    }

    if (Array.isArray(entry.gpay)) {
      for (const g of entry.gpay) {
        gpay += Number(g.amount || g.gpay_amount || 0);
      }
    }
  }

  return { cash, gpay };
};

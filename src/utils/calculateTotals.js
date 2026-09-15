module.exports = (entries = []) => {
  let cash = 0;
  let gpay = 0;

  for (const entry of entries) {
    if (Array.isArray(entry.cash)) {
      for (const c of entry.cash) {
        cash += Number(c.cash_amount || 0);
      }
    }

    if (Array.isArray(entry.gpay)) {
      for (const g of entry.gpay) {
        gpay += Number(g.gpay_amount || 0);
      }
    }
  }

  return { cash, gpay };
};

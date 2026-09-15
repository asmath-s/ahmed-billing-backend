"use strict";

const isBetweenDates = (date, fromDate, toDate) => {
  if (!date) return false;

  const d = new Date(date);

  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate) : null;

  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  return (!from || d >= from) && (!to || d <= to);
};

module.exports = {
  async getTotals(query) {
    const filters = query.filters || {};
    const fromDate = query.fromDate;
    const toDate = query.toDate;

    const data = await strapi.entityService.findMany("api::gst-list.gst-list", {
      filters,
    });

    const totals = {
      total_cash: 0,
      total_gpay: 0,
      total_account: 0,
      total_sales: 0,
      total_balance: 0,
      total_tax: 0,
      total_manual_paid: 0,
      total_base: 0,
    };

    data.forEach((item) => {
      const validDate = isBetweenDates(item.date, fromDate, toDate);

      if (!validDate) return;

      const baseAmount = Number(item.base_amount || 0);
      const totalAmount = Number(item.total_amount || 0);
      const taxAmount = Number(item.tax_amount || 0);

      // Base amount
      totals.total_base += baseAmount;

      // Total tax
      totals.total_tax += taxAmount;

      // Manual paid bills
      if (item.current_status === "manual_paid") {
        totals.total_manual_paid += totalAmount;
      } else {
        // Only normal bills are included in total sales
        totals.total_sales += totalAmount;
      }

      // Actual received amount
      let receivedAmount = Number(item.received_amount || 0);

      // Manual paid bills are considered fully paid
      if (item.current_status === "manual_paid") {
        receivedAmount = totalAmount;
      }

      const billBalance = totalAmount - receivedAmount;

      totals.total_balance += billBalance;

      // Receipt method totals
      if (item.received_amount) {
        const amount = Number(item.received_amount);

        if (item.received_method === "cash") {
          totals.total_cash += amount;
        }

        if (item.received_method === "gpay") {
          totals.total_gpay += amount;
        }

        if (item.received_method === "account") {
          totals.total_account += amount;
        }
      }
    });

    return totals;
  },
};

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

const createTotals = () => ({
  total_exp_cash: 0,
  total_exp_gpay: 0,
  total_rec_cash: 0,
  total_rec_gpay: 0,
});

const calculateTotals = (items, fromDate, toDate) => {
  const totals = createTotals();

  items.forEach((item) => {
    if (!isBetweenDates(item.date, fromDate, toDate)) return;

    const amount = Number(item.amount || 0);

    if (item.method === "expense") {
      if (item.custom_type === "cash") {
        totals.total_exp_cash += amount;
      } else if (item.custom_type === "gpay") {
        totals.total_exp_gpay += amount;
      }
    } else if (item.method === "receive") {
      if (item.custom_type === "cash") {
        totals.total_rec_cash += amount;
      } else if (item.custom_type === "gpay") {
        totals.total_rec_gpay += amount;
      }
    }
  });

  return totals;
};

module.exports = {
  async getTotals(query) {
    const fromDate = query.fromDate;
    const toDate = query.toDate;

    // Local Expense
    const localExpenses = await strapi.entityService.findMany(
      "api::local-expense.local-expense",
      {
        filters: { role: "authenticated" },
        sort: { date: "desc" },
      },
    );

    // Admin Expense (role = authenticated)
    const adminExpenses = await strapi.entityService.findMany(
      "api::admin-expense.admin-expense",
      {
        filters: { role: "authenticated" },
        sort: { date: "desc" },
      },
    );

    const totals = {
      expense: createTotals(),
      approved: createTotals(),
      production: createTotals(),
      hub: createTotals(),
      admin: createTotals(),
    };

    // Local Expense Totals
    localExpenses.forEach((item) => {
      if (!isBetweenDates(item.date, fromDate, toDate)) return;

      let key = null;

      if (!item.approved && item.current_status === null) {
        key = "expense";
      } else if (item.approved && item.current_status === "approved") {
        key = "approved";
      } else if (item.approved && item.current_status === "production") {
        key = "production";
      } else if (item.approved && item.current_status === "hub") {
        key = "hub";
      }

      if (!key) return;

      const amount = Number(item.amount || 0);

      if (item.method === "expense") {
        if (item.custom_type === "cash") {
          totals[key].total_exp_cash += amount;
        } else if (item.custom_type === "gpay") {
          totals[key].total_exp_gpay += amount;
        }
      } else if (item.method === "receive") {
        if (item.custom_type === "cash") {
          totals[key].total_rec_cash += amount;
        } else if (item.custom_type === "gpay") {
          totals[key].total_rec_gpay += amount;
        }
      }
    });

    // Admin Totals
    totals.admin = calculateTotals(adminExpenses, fromDate, toDate);

    totals.total = createTotals();

    ["expense", "approved", "production", "hub", "admin"].forEach((key) => {
      totals.total.total_exp_cash += totals[key].total_exp_cash;
      totals.total.total_exp_gpay += totals[key].total_exp_gpay;
      totals.total.total_rec_cash += totals[key].total_rec_cash;
      totals.total.total_rec_gpay += totals[key].total_rec_gpay;
    });

    return totals;
  },
};

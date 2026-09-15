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
  total_exp_account: 0,
  total_rec_cash: 0,
  total_rec_gpay: 0,
  total_rec_account: 0,
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
      } else if (item.custom_type === "account") {
        totals.total_exp_account += amount;
      }
    } else if (item.method === "receive") {
      if (item.custom_type === "cash") {
        totals.total_rec_cash += amount;
      } else if (item.custom_type === "gpay") {
        totals.total_rec_gpay += amount;
      } else if (item.custom_type === "account") {
        totals.total_rec_account += amount;
      }
    }
  });

  return totals;
};

module.exports = {
  async getTotals(query) {
    const fromDate = query.fromDate;
    const toDate = query.toDate;

    const instruction = query.filters?.instruction?.$containsi || "";

    const filters = {};

    if (instruction) {
      filters.instruction = {
        $containsi: instruction,
      };
    }
    const localExpenses = await strapi.entityService.findMany(
      "api::local-expense.local-expense",
      {
        filters,
        sort: { date: "desc" },
      },
    );

    const adminExpenses = await strapi.entityService.findMany(
      "api::admin-expense.admin-expense",
      {
        filters,
        sort: { date: "desc" },
      },
    );

    const totals = {
      expense: createTotals(),
      approved: createTotals(),
      production: createTotals(),
      hub: createTotals(),
      admin: createTotals(),

      total: createTotals(),

      // Separate expense total
      local_expense_total: 0,
      local_receive_total: 0,
    };

    // Local Expense Totals
    localExpenses.forEach((item) => {
      if (!isBetweenDates(item.date, fromDate, toDate)) return;

      let key = null;

      if (!item.approved) {
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
        } else if (item.custom_type === "account") {
          totals[key].total_exp_account += amount;
        }
      } else if (item.method === "receive") {
        if (item.custom_type === "cash") {
          totals[key].total_rec_cash += amount;
        } else if (item.custom_type === "gpay") {
          totals[key].total_rec_gpay += amount;
        } else if (item.custom_type === "account") {
          totals[key].total_rec_account += amount;
        }
      }
    });

    // Admin Totals
    totals.admin = calculateTotals(adminExpenses, fromDate, toDate);

    ["expense", "approved", "production", "hub", "admin"].forEach((key) => {
      totals.total.total_exp_cash += totals[key].total_exp_cash;
      totals.total.total_exp_gpay += totals[key].total_exp_gpay;
      totals.total.total_exp_account += totals[key].total_exp_account;
      totals.total.total_rec_cash += totals[key].total_rec_cash;
      totals.total.total_rec_gpay += totals[key].total_rec_gpay;
      totals.total.total_rec_account += totals[key].total_rec_account;
    });

    // Separate Expense Total

    totals.local_expense_total =
      totals.expense.total_exp_cash +
      totals.expense.total_exp_gpay +
      totals.expense.total_exp_account +
      totals.approved.total_exp_cash +
      totals.approved.total_exp_gpay +
      totals.approved.total_exp_account +
      totals.production.total_exp_cash +
      totals.production.total_exp_gpay +
      totals.production.total_exp_account +
      totals.hub.total_exp_cash +
      totals.hub.total_exp_gpay +
      totals.hub.total_exp_account;

    totals.local_receive_total =
      totals.expense.total_rec_cash +
      totals.expense.total_rec_gpay +
      totals.expense.total_rec_account +
      totals.approved.total_rec_cash +
      totals.approved.total_rec_gpay +
      totals.approved.total_rec_account +
      totals.production.total_rec_cash +
      totals.production.total_rec_gpay +
      totals.production.total_rec_account +
      totals.hub.total_rec_cash +
      totals.hub.total_rec_gpay +
      totals.hub.total_rec_account;

    return totals;
  },
};

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

    const data = await strapi.entityService.findMany(
      "api::admin-expense.admin-expense",
      {
        filters,
      },
    );

    const totals = {
      // Asmath
      asmathTotalGet: 0,
      asmathTotalGive: 0,
      asmathTotalBalance: 0,

      asmathGetInCash: 0,
      asmathGetInGapy: 0,
      asmathGetInAccount: 0,

      asmathGiveInCash: 0,
      asmathGiveInGapy: 0,
      asmathGiveInAccount: 0,

      // Ibu
      ibuTotalGet: 0,
      ibuTotalGive: 0,
      ibuTotalBalance: 0,

      ibuGetInCash: 0,
      ibuGetInGapy: 0,
      ibuGetInAccount: 0,

      ibuGiveInCash: 0,
      ibuGiveInGapy: 0,
      ibuGiveInAccount: 0,
    };

    data.forEach((item) => {
      if (!isBetweenDates(item.date, fromDate, toDate)) return;

      const amount = Number(item.amount || 0);
      const instruction = (item.instruction || "").toLowerCase().trim();

      const isAsmath = instruction.includes("asmath");
      const isIbu = instruction.includes("ibu");
      const method = item.method;
      const type = item.custom_type;

      // ---------------- ASMATH ----------------
      if (isAsmath) {
        if (method === "receive") {
          totals.asmathTotalGet += amount;

          if (type === "cash") totals.asmathGetInCash += amount;
          else if (type === "gpay") totals.asmathGetInGapy += amount;
          else if (type === "account") totals.asmathGetInAccount += amount;
        }

        if (method === "expense") {
          totals.asmathTotalGive += amount;

          if (type === "cash") totals.asmathGiveInCash += amount;
          else if (type === "gpay") totals.asmathGiveInGapy += amount;
          else if (type === "account") totals.asmathGiveInAccount += amount;
        }
      }

      // ---------------- IBU ----------------
      if (isIbu) {
        if (method === "receive") {
          totals.ibuTotalGet += amount;

          if (type === "cash") totals.ibuGetInCash += amount;
          else if (type === "gpay") totals.ibuGetInGapy += amount;
          else if (type === "account") totals.ibuGetInAccount += amount;
        }

        if (method === "expense") {
          totals.ibuTotalGive += amount;

          if (type === "cash") totals.ibuGiveInCash += amount;
          else if (type === "gpay") totals.ibuGiveInGapy += amount;
          else if (type === "account") totals.ibuGiveInAccount += amount;
        }
      }
    });

    totals.asmathTotalBalance = totals.asmathTotalGive - totals.asmathTotalGet;

    totals.ibuTotalBalance = totals.ibuTotalGive - totals.ibuTotalGet;

    return totals;
  },
};

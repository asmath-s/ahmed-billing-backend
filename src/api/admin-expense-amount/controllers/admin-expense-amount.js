"use strict";

module.exports = {
  async find(ctx) {
    try {
      const query = ctx.query || {};
      const data = await strapi
        .service("api::admin-expense-amount.admin-expense-amount")
        .getTotals(query);

      ctx.body = data;
    } catch (error) {
      strapi.log.error("Failed to retrieve admin expense totals:", error);
      ctx.internalServerError("Failed to calculate admin expense totals.");
    }
  },
};

"use strict";

module.exports = {
  async find(ctx) {
    try {
      const query = ctx.query || {};
      const data = await strapi
        .service(
          "api::local-authenticated-expense-amount.local-authenticated-expense-amount",
        )
        .getTotals(query);

      ctx.body = data;
    } catch (error) {
      strapi.log.error(
        "Failed to retrieve local authenticated expense totals:",
        error,
      );
      ctx.internalServerError(
        "Failed to calculate local authenticated expense totals.",
      );
    }
  },
};

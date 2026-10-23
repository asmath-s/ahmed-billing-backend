"use strict";

module.exports = {
  async find(ctx) {
    try {
      const query = ctx.query || {};
      const data = await strapi
        .service("api::local-amount.local-amount")
        .getTotals(query);

      ctx.body = data;
    } catch (error) {
      strapi.log.error("Failed to retrieve local totals:", error);
      ctx.internalServerError("Failed to calculate local totals.");
    }
  },
};

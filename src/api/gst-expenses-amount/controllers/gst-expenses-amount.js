"use strict";

module.exports = {
  async find(ctx) {
    try {
      const query = ctx.query || {};
      const data = await strapi
        .service("api::gst-expenses-amount.gst-expenses-amount")
        .getTotals(query);

      ctx.body = data;
    } catch (error) {
      strapi.log.error("Failed to retrieve GST expense totals:", error);
      ctx.internalServerError("Failed to calculate GST expense totals.");
    }
  },
};

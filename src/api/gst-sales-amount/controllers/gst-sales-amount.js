"use strict";

module.exports = {
  async find(ctx) {
    try {
      const query = ctx.query || {};
      const data = await strapi
        .service("api::gst-sales-amount.gst-sales-amount")
        .getTotals(query);

      ctx.body = data;
    } catch (error) {
      strapi.log.error("Failed to retrieve GST sales totals:", error);
      ctx.internalServerError("Failed to calculate GST sales totals.");
    }
  },
};

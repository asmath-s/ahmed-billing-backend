module.exports = {
  async find(ctx) {
    const query = ctx.query;

    const data = await strapi
      .service("api::gst-sales-amount.gst-sales-amount")
      .getTotals(query);

    ctx.body = data;
  },
};

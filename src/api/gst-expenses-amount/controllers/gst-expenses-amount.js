module.exports = {
  async find(ctx) {
    const query = ctx.query;

    const data = await strapi
      .service("api::gst-expenses-amount.gst-expenses-amount")
      .getTotals(query);

    ctx.body = data;
  },
};

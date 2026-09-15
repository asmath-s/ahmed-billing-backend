module.exports = {
  async find(ctx) {
    const query = ctx.query;

    const data = await strapi
      .service("api::local-amount.local-amount")
      .getTotals(query);

    ctx.body = data;
  },
};

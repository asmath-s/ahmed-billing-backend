module.exports = {
  async find(ctx) {
    const query = ctx.query;

    const data = await strapi
      .service(
        "api::local-authenticated-expense-amount.local-authenticated-expense-amount",
      )
      .getTotals(query);

    ctx.body = data;
  },
};

module.exports = {
  async find(ctx) {
    const query = ctx.query;

    const data = await strapi
      .service("api::local-expense-amount.local-expense-amount")
      .getTotals(query);

    ctx.body = data;
  },
};
module.exports = {
  async find(ctx) {
    const query = ctx.query;

    const data = await strapi
      .service("api::admin-expense-amount.admin-expense-amount")
      .getTotals(query);

    ctx.body = data;
  },
};

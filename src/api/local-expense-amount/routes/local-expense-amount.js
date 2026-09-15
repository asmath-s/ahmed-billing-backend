module.exports = {
  routes: [
    {
      method: "GET",
      path: "/local-expense-amounts",
      handler: "local-expense-amount.find",
    },
  ],
};

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/local-authenticated-expense-amounts",
      handler: "local-authenticated-expense-amount.find",
    },
  ],
};

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/admin-expense-amounts",
      handler: "admin-expense-amount.find",
    },
  ],
};

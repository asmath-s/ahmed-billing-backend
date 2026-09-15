module.exports = {
  routes: [
    {
      method: "GET",
      path: "/local-amounts",
      handler: "local-amount.find",
    },
  ],
};

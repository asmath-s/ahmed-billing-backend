module.exports = {
  routes: [
    {
      method: "GET",
      path: "/gst-sales-amounts",
      handler: "gst-sales-amount.find",
    },
  ],
};

"use strict";

const {
  isDateBetween,
  sumPaymentsBetween,
  valueBetween,
} = require("../../../utils/dateUtils");

module.exports = {
  async getTotals(query = {}) {
    const filters = query.filters || {};
    const fromDate = query.fromDate || null;
    const toDate = query.toDate || null;

    const data = await strapi.entityService.findMany(
      "api::local-list.local-list",
      {
        filters,
        populate: {
          customer: true,
          cash: true,
          gpay: true,
          no_recieved: true,
        },
      },
    );

    const totals = {
      local_list: {
        total_cash: 0,
        total_gpay: 0,
        total_no_recieved: 0,
        total_balance: 0,
      },

      local_paid: {
        total_cash: 0,
        total_gpay: 0,
        total_no_recieved: 0,
        total_balance: 0,
      },

      local_pending: {
        total_cash: 0,
        total_gpay: 0,
        total_no_recieved: 0,
        total_balance: 0,
      },

      local_party: {
        total_cash: 0,
        total_gpay: 0,
        total_no_recieved: 0,
        total_balance: 0,
      },

      local_total: {
        total_cash: 0,
        total_gpay: 0,
        total_no_recieved: 0,
        total_balance: 0,
      },

      sales_total: 0,
    };

    if (!Array.isArray(data)) {
      return totals;
    }

    /**
     * Store party information customer-wise.
     *
     * Example:
     * customer 999:
     * party bills: 200, 450, 150
     * party payments: 6000
     * Result: 800 - 6000 = -5200
     */
    const partyByCustomer = {};

    data.forEach((item) => {
      /**
       * -------------------------------------------------------
       * STATUS
       * -------------------------------------------------------
       */
      let statusKey = "local_list";

      if (item.approved === true) {
        if (item.current_status === "paid") {
          statusKey = "local_paid";
        } else if (item.current_status === "pending") {
          statusKey = "local_pending";
        } else if (item.current_status === "party") {
          statusKey = "local_party";
        }
      }

      /**
       * -------------------------------------------------------
       * CASH
       * -------------------------------------------------------
       */
      const cashTotal = sumPaymentsBetween(item.cash, fromDate, toDate);

      /**
       * -------------------------------------------------------
       * GPAY
       * -------------------------------------------------------
       */
      const gpayTotal = sumPaymentsBetween(item.gpay, fromDate, toDate);

      /**
       * -------------------------------------------------------
       * NO RECIEVED
       * -------------------------------------------------------
       */
      const noRecievedSum = sumPaymentsBetween(
        item.no_recieved,
        fromDate,
        toDate,
      );

      const noRecievedTotal = noRecievedSum;

      /**
       * -------------------------------------------------------
       * SALES TOTAL
       *
       * total_amount = 0 for separate party payment,
       * therefore it will not increase sales.
       * -------------------------------------------------------
       */
      const salesTotal =
        valueBetween(item.total_amount, item.date, fromDate, toDate) -
        noRecievedTotal;

      totals.sales_total += salesTotal;

      /**
       * -------------------------------------------------------
       * CASH / GPAY / NO RECIEVED TOTAL
       * -------------------------------------------------------
       */
      totals[statusKey].total_cash += cashTotal;
      totals[statusKey].total_gpay += gpayTotal;
      totals[statusKey].total_no_recieved += noRecievedTotal;

      totals.local_total.total_cash += cashTotal;
      totals.local_total.total_gpay += gpayTotal;
      totals.local_total.total_no_recieved += noRecievedTotal;

      /**
       * -------------------------------------------------------
       * NON-PARTY BALANCE
       * -------------------------------------------------------
       *
       * Paid / pending / normal local records:
       * directly add balance_amount.
       *
       * Party records are handled separately below.
       * -------------------------------------------------------
       */
      if (statusKey !== "local_party") {
        const balance = valueBetween(
          item.balance_amount,
          item.date,
          fromDate,
          toDate,
        );

        const adjustedBalance = balance - noRecievedTotal;

        totals[statusKey].total_balance += adjustedBalance;
        totals.local_total.total_balance += adjustedBalance;
      }

      /**
       * -------------------------------------------------------
       * PARTY
       * -------------------------------------------------------
       */
      if (statusKey === "local_party") {
        /**
         * Get customer ID.
         */
        const customerId =
          item.customer?.id || item.customer?.documentId || item.customer_id;

        /**
         * If there is no customer, skip customer-wise party balance calculation.
         */
        if (!customerId) {
          return;
        }

        /**
         * Initialize customer.
         */
        if (!partyByCustomer[customerId]) {
          partyByCustomer[customerId] = {
            billBalance: 0,
            received: 0,
            noRecieved: 0,
          };
        }

        const totalAmount = Number(item.total_amount || 0);
        const balanceAmount = Number(item.balance_amount || 0);
        const receivedAmount = Number(item.received_amount || 0);

        /**
         * -----------------------------------------------------
         * SEPARATE PARTY PAYMENT
         *
         * Example:
         * total_amount     = 0
         * balance_amount   = 0
         * received_amount  = 6000
         * or no_recieved   = 500
         *
         * This is NOT a bill. It reduces the customer's party balance.
         * -----------------------------------------------------
         */
        const isSeparatePartyPayment =
          totalAmount === 0 && balanceAmount === 0 && receivedAmount > 0;

        if (isSeparatePartyPayment) {
          if (isDateBetween(item.date, fromDate, toDate)) {
            partyByCustomer[customerId].received += receivedAmount;
          }

          return;
        }

        /**
         * -----------------------------------------------------
         * NORMAL PARTY BILL
         *
         * Example:
         * total_amount   = 200
         * balance_amount = 200
         *
         * Add the outstanding balance.
         * -----------------------------------------------------
         */
        if (isDateBetween(item.date, fromDate, toDate)) {
          partyByCustomer[customerId].billBalance += balanceAmount;
          partyByCustomer[customerId].noRecieved += noRecievedTotal;
        }
      }
    });

    /**
     * ---------------------------------------------------------
     * CALCULATE FINAL PARTY BALANCE
     * ---------------------------------------------------------
     *
     * DO NOT use Math.max(). We WANT negative values.
     * Example:
     * billBalance = 800, received = 6000, noRecieved = 500
     * balance = 800 - 6000 - 500 = -5700
     */
    Object.values(partyByCustomer).forEach((customer) => {
      const finalPartyBalance =
        customer.billBalance - customer.received - customer.noRecieved;

      /**
       * Party balance.
       */
      totals.local_party.total_balance += finalPartyBalance;

      /**
       * Overall balance.
       */
      totals.local_total.total_balance += finalPartyBalance;
    });

    return totals;
  },
};

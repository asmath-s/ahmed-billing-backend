"use strict";

/**
 * Check whether a date is inside the selected date range.
 */
const isDateBetween = (date, fromDate, toDate) => {
  if (!date) return false;

  const currentDate = new Date(date);

  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate) : null;

  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  if (from && currentDate < from) {
    return false;
  }

  if (to && currentDate > to) {
    return false;
  }

  return true;
};

/**
 * Sum cash/gpay payment records by their payment date.
 */
const sumPaymentsBetween = (payments, fromDate, toDate) => {
  if (!Array.isArray(payments)) {
    return 0;
  }

  return payments.reduce((total, payment) => {
    if (!payment || !payment.date) {
      return total;
    }

    if (!isDateBetween(payment.date, fromDate, toDate)) {
      return total;
    }

    return total + Number(payment.amount || 0);
  }, 0);
};

/**
 * Get a value only when the parent record date
 * is inside the selected date range.
 */
const valueBetween = (value, date, fromDate, toDate) => {
  if (value === null || value === undefined || !date) {
    return 0;
  }

  if (!isDateBetween(date, fromDate, toDate)) {
    return 0;
  }

  return Number(value || 0);
};

module.exports = {
  async getTotals(query) {
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
        },
      },
    );

    const totals = {
      local_list: {
        total_cash: 0,
        total_gpay: 0,
        total_balance: 0,
      },

      local_paid: {
        total_cash: 0,
        total_gpay: 0,
        total_balance: 0,
      },

      local_pending: {
        total_cash: 0,
        total_gpay: 0,
        total_balance: 0,
      },

      local_party: {
        total_cash: 0,
        total_gpay: 0,
        total_balance: 0,
      },

      local_total: {
        total_cash: 0,
        total_gpay: 0,
        total_balance: 0,
      },

      sales_total: 0,
    };

    /**
     * Store party information customer-wise.
     *
     * Example:
     *
     * customer 999:
     *
     * party bills:
     * 200
     * 450
     * 150
     *
     * party payments:
     * 6000
     *
     * Result:
     *
     * 800 - 6000 = -5200
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
       * SALES TOTAL
       *
       * total_amount = 0 for separate party payment,
       * therefore it will not increase sales.
       * -------------------------------------------------------
       */
      const salesTotal = valueBetween(
        item.total_amount,
        item.date,
        fromDate,
        toDate,
      );

      totals.sales_total += salesTotal;

      /**
       * -------------------------------------------------------
       * CASH / GPAY TOTAL
       * -------------------------------------------------------
       */
      totals[statusKey].total_cash += cashTotal;
      totals[statusKey].total_gpay += gpayTotal;

      totals.local_total.total_cash += cashTotal;
      totals.local_total.total_gpay += gpayTotal;

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

        totals[statusKey].total_balance += balance;
        totals.local_total.total_balance += balance;
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
         * If there is no customer, skip customer-wise
         * party balance calculation.
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
         *
         * total_amount     = 0
         * balance_amount   = 0
         * received_amount  = 6000
         *
         * This is NOT a bill.
         *
         * It reduces the customer's party balance.
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
         *
         * total_amount   = 200
         * balance_amount = 200
         *
         * Add the outstanding balance.
         * -----------------------------------------------------
         */
        if (isDateBetween(item.date, fromDate, toDate)) {
          partyByCustomer[customerId].billBalance += balanceAmount;
        }
      }
    });

    /**
     * ---------------------------------------------------------
     * CALCULATE FINAL PARTY BALANCE
     * ---------------------------------------------------------
     *
     * DO NOT use Math.max().
     *
     * We WANT negative values.
     *
     * Example:
     *
     * billBalance = 800
     * received    = 6000
     *
     * balance = 800 - 6000
     *         = -5200
     */
    Object.values(partyByCustomer).forEach((customer) => {
      const finalPartyBalance = customer.billBalance - customer.received;

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

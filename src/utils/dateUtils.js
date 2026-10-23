"use strict";

/**
 * Shared Date Utilities for Strapi Backend
 * Handles date range comparisons reliably across ISO strings and date formats.
 */

/**
 * Parses a date or date-string into a Date object or timestamp.
 * Safely handles "YYYY-MM-DD" date-only strings and full ISO strings.
 *
 * @param {string|Date} dateVal
 * @param {boolean} isEndOfDay - If true and string is date-only, sets time to 23:59:59.999
 * @returns {Date|null}
 */
const parseDateBoundary = (dateVal, isEndOfDay = false) => {
  if (!dateVal) return null;

  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    const d = new Date(dateVal.getTime());
    if (isEndOfDay) {
      d.setHours(23, 59, 59, 999);
    }
    return d;
  }

  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed) return null;

    // Check if it's a YYYY-MM-DD date-only string
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map(Number);
      if (isEndOfDay) {
        return new Date(year, month - 1, day, 23, 59, 59, 999);
      }
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return null;

    if (isEndOfDay) {
      parsed.setHours(23, 59, 59, 999);
    }
    return parsed;
  }

  return null;
};

/**
 * Checks whether a given record date is between fromDate and toDate (inclusive).
 *
 * @param {string|Date} date - The record date (e.g. from Strapi ISO datetime)
 * @param {string|Date|null} fromDate - Lower date boundary
 * @param {string|Date|null} toDate - Upper date boundary
 * @returns {boolean}
 */
const isBetweenDates = (date, fromDate, toDate) => {
  if (!date) return false;

  const current = new Date(date);
  if (isNaN(current.getTime())) return false;

  const from = parseDateBoundary(fromDate, false);
  const to = parseDateBoundary(toDate, true);

  if (from && current < from) {
    return false;
  }

  if (to && current > to) {
    return false;
  }

  return true;
};

/**
 * Sum cash/gpay payment records by their payment date within a date range.
 *
 * @param {Array} payments - Array of payment component records
 * @param {string|Date|null} fromDate - Lower date boundary
 * @param {string|Date|null} toDate - Upper date boundary
 * @returns {number}
 */
const sumPaymentsBetween = (payments, fromDate, toDate) => {
  if (!Array.isArray(payments)) {
    return 0;
  }

  return payments.reduce((total, payment) => {
    if (!payment || !payment.date) {
      return total;
    }

    if (!isBetweenDates(payment.date, fromDate, toDate)) {
      return total;
    }

    return total + Number(payment.amount || 0);
  }, 0);
};

/**
 * Get a value only when the parent record date is inside the selected date range.
 *
 * @param {number|string} value - Numerical value to return
 * @param {string|Date} date - Record date
 * @param {string|Date|null} fromDate - Lower date boundary
 * @param {string|Date|null} toDate - Upper date boundary
 * @returns {number}
 */
const valueBetween = (value, date, fromDate, toDate) => {
  if (value === null || value === undefined || !date) {
    return 0;
  }

  if (!isBetweenDates(date, fromDate, toDate)) {
    return 0;
  }

  return Number(value || 0);
};

module.exports = {
  isBetweenDates,
  isDateBetween: isBetweenDates, // Alias for local-amount compatibility
  sumPaymentsBetween,
  valueBetween,
  parseDateBoundary,
};

'use strict';

/**
 * gst-expense service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::gst-expense.gst-expense');

'use strict';

/**
 * gst-customer service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::gst-customer.gst-customer');

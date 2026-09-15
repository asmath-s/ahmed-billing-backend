'use strict';

/**
 * quotation service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::quotation.quotation');

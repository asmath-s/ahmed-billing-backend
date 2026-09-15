'use strict';

/**
 * local-expense service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::local-expense.local-expense');

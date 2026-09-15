'use strict';

/**
 * admin-expense service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::admin-expense.admin-expense');

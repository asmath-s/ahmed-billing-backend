"use strict";

/**
 * local-list service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::local-list.local-list");

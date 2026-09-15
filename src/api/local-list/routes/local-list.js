"use strict";

/**
 * local-list router
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter("api::local-list.local-list");

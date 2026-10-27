"use strict";
const seedDummyData = require("../scripts/seedDummyData");
const cleanDummyData = require("../scripts/cleanDummyData");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "⚡ Running Sequelize CLI seeder: dummy products, ingredients, recipes & initial stock...",
    );
    await seedDummyData();
  },

  async down(queryInterface, Sequelize) {
    console.log("⚠️ Reverting dummy products, ingredients, recipes...");
    await cleanDummyData();
  },
};

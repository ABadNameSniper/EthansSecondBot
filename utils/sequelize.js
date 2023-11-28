const { Sequelize } = require('sequelize');
const { database, user, password, options } = require('../config.json');
const sequelize = new Sequelize(database, user, password, options);

module.exports = sequelize;
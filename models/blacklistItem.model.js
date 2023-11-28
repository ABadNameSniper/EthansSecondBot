const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const blacklistItem = sequelize.define('blacklistItem', {
    severity: {
        type: DataTypes.INTEGER,
        validate: {min : 1, max: 4}
    }
});

module.exports = blacklistItem;
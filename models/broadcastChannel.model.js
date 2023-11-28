const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const broadcastChannel = sequelize.define("broadcastChannel", {
    categoryName: {
        type: DataTypes.STRING
    },
    listenerIds: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: false
    },
})

module.exports = broadcastChannel
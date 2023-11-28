const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const quote = sequelize.define('quote', {
    sourceChannelId: {
        type: DataTypes.STRING
    },
    sourceMessageId: {
        type: DataTypes.STRING
    },
    content: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sourceAlias: {
        type: DataTypes.STRING,
    },
    archiverUserId: {
        type: DataTypes.STRING,
    },
    sourceUserId: {
        type: DataTypes.STRING,
    },
})

module.exports = quote;
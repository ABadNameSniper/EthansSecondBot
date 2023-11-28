const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');
const minesweeperGame = require('./minesweeperGame.model.js');
const blacklistItem = require('./blacklistItem.model.js');
const quote = require('./quote.model.js');
const broadcastChannel = require('./broadcastChannel.model.js');
const defaultUserSettings = {
    anonymizeTag: "Server"
}

const savedUser = sequelize.define('savedUser', {
    userId: {
        type: DataTypes.STRING,
        unique: true,
        primaryKey: true
    },
    settings: {
        type: DataTypes.JSON,
        defaultValue: defaultUserSettings
    },
    settingsPage: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    introSelected: {
        type: DataTypes.STRING,
        defaultValue: "none"
    }
});

savedUser.hasMany(minesweeperGame, { foreignKey: 'userId' });
savedUser.hasMany(blacklistItem, { foreignKey: 'userId' });
savedUser.hasMany(quote, { foreignKey: "archiverUserId" });
savedUser.hasMany(quote, { foreignKey: "sourceUserId" });
savedUser.hasMany(broadcastChannel, { foreignKey: 'userId' });

module.exports = savedUser;
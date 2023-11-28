const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');
const minesweeperGame = require('./minesweeperGame.model.js');
const blacklistItem = require('./blacklistItem.model.js');
const quote = require('./quote.model.js');
const fs = require('fs');
const path = require('path');
const triggerWords = fs.readdirSync(path.resolve(__dirname, '../triggerwords'));
const defaultServerSettings = {
    anonymizeName: true,
    allowhyperchats: true,
};
for (const file of triggerWords) {
    defaultServerSettings[file] = true;
}

const savedGuild = sequelize.define('savedGuild', {
    guildId: {
        type: DataTypes.STRING,
        unique: true,
        primaryKey: true,
    },
    serverSettings: {
        type: DataTypes.JSON,
        defaultValue: defaultServerSettings,
    },
    serverSettingsPage: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

savedGuild.hasMany(minesweeperGame, {foreignKey: 'guildId'});
savedGuild.hasMany(blacklistItem, {foreignKey: 'guildId' });
savedGuild.hasMany(quote, { foreignKey: 'archiverGuildId' });

module.exports = savedGuild;
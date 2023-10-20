const { SlashCommandBuilder } = require('@discordjs/builders');

const indexRoot = process.cwd();
const { globalAndTestGuildId, database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js');
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes);
const serverInfo = databaseModels.serverInfo(sequelize, Sequelize.DataTypes);
const quote = databaseModels.quote(sequelize, Sequelize.DataTypes);

userInfo.hasMany(quote, {foreignKey: "archiverId"});
userInfo.hasMany(quote, {foreignKey: "sourceUserId"});
serverInfo.hasMany(quote);

userInfo.sync();
serverInfo.sync();
quote.sync();

module.exports = {
    guildCommand: true,
    guildWhitelist: [globalAndTestGuildId],
	data: new SlashCommandBuilder()
    .setName('deletequote')
    .setDescription('deletes a quote')
    .addNumberOption(option =>
        option.setName('id')
        .setDescription('yes')
        .setRequired(true)
    ),
    execute(interaction) {
        quote.destroy({
            where:{
                id: interaction.options.getNumber('id')
            }
        })
    }
}
const { SlashCommandBuilder } = require('@discordjs/builders');
const indexRoot = process.cwd()
const { globalAndTestGuildId, permissionHierarchy, database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
module.exports = {
    guildCommand: true,
    guildWhitelist: [globalAndTestGuildId],
	data: new SlashCommandBuilder()
		.setName('deletedb')
		.setDescription("this probably shouldn't be a command!")
        
        .addStringOption(option =>
            option.setName("databasename")
                .setDescription("The database to drop")
                .setRequired(true)),
    async execute(interaction) {
        if (!permissionHierarchy.admins.includes(interaction.user.id)) return;

        const dbname = interaction.options.getString('databasename');
        console.log(dbname + " to be deleted");
        if (require(indexRoot+'/utils/databaseModels.js')[dbname]) {
            require(indexRoot+'/utils/databaseModels.js')[dbname](sequelize, Sequelize.DataTypes).sync({force: true}).then(
                () => {console.log(`Dropped ${dbname}`); interaction.reply(`Dropped ${dbname}`)}
            ).catch(error => console.log(error));
        } else {
            interaction.reply("No database found!")
        }
    }
}
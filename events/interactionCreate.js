const { InteractionType } = require("discord-api-types/v10");

const indexRoot = process.cwd();
const { globalAndTestGuildId, database, user, password, options } = require(indexRoot+'/config.json');
const { Sequelize, Op } = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require('../utils/databaseModels');
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes);
const blacklistItem = databaseModels.blacklistItem(sequelize, Sequelize.DataTypes);
const serverInfo = databaseModels.serverInfo(sequelize, Sequelize.DataTypes);
userInfo.hasMany(blacklistItem, {sourceKey: 'userId'});
blacklistItem.belongsTo(userInfo, {targetKey: 'userId'});
serverInfo.hasMany(blacklistItem, {sourceKey: 'serverId'});
blacklistItem.belongsTo(serverInfo, {targetKey: 'serverId'});


module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
        const client = interaction.client

        if (interaction.type !== InteractionType.ApplicationCommand) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            const user = databaseModels.userInfoDefault(userInfo, interaction.user.id);

            const blacklistItems = await blacklistItem.findAll({
                where: {// Filtering out irrelevant servers
                    [Op.or]: [
                        {serverInfoServerId: interaction.guildId}, 
                        {serverInfoServerId: globalAndTestGuildId}
                    ],
                },
                order: [
                    ["severity", "DESC"]
                ],
            })

            for (const item of blacklistItems) {
                if (item.severity >= (command.severityThreshold || 4)) {
                    interaction.reply({ 
                        content: `You've been blacklisted from Ethan's Second Bot ${
                            item.serverInfoServerId === globalAndTestGuildId
                                ? "everywhere"
                                : "in this server"
                            } at severity level ${
                                item.severity
                            } and cannot use this command.`,
                        ephemeral: true}
                    );
                    return;
                }
            }

            await command.execute(interaction, user);
        } catch (error) {
            console.log("Something went wrong trying to execute a command!");
            console.log(error);
            try {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            } catch (error) {
                console.log(
                    "The failure message failed to send!",
                    "Something has gone catostrophically wrong, or the interaction was already replied to."
                    )
                console.log(error)
            }
        }
	},
};
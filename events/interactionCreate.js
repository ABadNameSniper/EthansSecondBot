const { InteractionType } = require("discord-api-types/v10");
const { globalAndTestGuildId } = require('../config.json');
const { Op } = require('sequelize');
const { savedUser, blacklistItem, savedGuild } = require('../models');

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
        const client = interaction.client

        if (interaction.type !== InteractionType.ApplicationCommand) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            const [currentUser] = await savedUser.findOrCreate({where: {userId: interaction.user.id}});

            const blacklistItems = await blacklistItem.findAll({
                where: {// Filtering out irrelevant servers
                    [Op.or]: [
                        {guildId: interaction.guildId}, 
                        {guildId: globalAndTestGuildId}
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
                            item.guildId === globalAndTestGuildId
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

            const currentGuild = interaction.channel.isDMBased()
                ? null
                : (await savedGuild.findOrCreate({where: {guildId: interaction.channel.guildId}}))[0];

            await command.execute(interaction, currentUser, currentGuild);
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
const { SlashCommandBuilder } = require('@discordjs/builders');
const { globalAndTestGuildId, admins } = require('../config.json');
const { blacklistItem } = require('../models');
const savedUser = require('../models/savedUser.model');

module.exports = {
    guildCommand: true,
    //maybe add a time option some day
	data: new SlashCommandBuilder()
		.setName('blacklist')
		.setDescription(`Removes a user's ability to interact with the bot.`)
        .setDefaultMemberPermissions('0')
        .setDMPermission(false)
        .addUserOption(option =>
            option.setName("user")
            .setDescription("The user to blacklist from the bot")
            .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName("severity")
            .setDescription("Bigger number means less things the user can do with the bot. Use /info (pg. 2) for more... info.")
        )
        .addBooleanOption(option =>
            option.setName("remove")
            .setDescription("Remove player from blacklist? Default: false (you're adding them to it)")
        )
        .addBooleanOption(option =>
            option.setName("global")
            .setDescription("Will this blacklist apply outside of this server? Admins only.")
        ),
    async execute(interaction) {
        if (!(
            admins.includes(interaction.user.id)
            || interaction.guild.ownerId === interaction.user.id
        )) return;

        const user = interaction.options.getUser('user');
        if (user.bot) {
            interaction.reply("There's no need to blacklist bots!");
            return;
        }
        const userId = user.id;
        await savedUser.findOrCreate({where: {userId}})
        const severity = Math.max(Math.min(interaction.options.getInteger('severity'), 4), 1)   || 1;
        const remove = interaction.options.getBoolean('remove')                                 || false;
        const global = interaction.options.getBoolean('global')                                 || false;
        if (!remove) {
            await blacklistItem.create({
                userId,
                guildId: (global && admins.includes(interaction.user.id) )
                    ? globalAndTestGuildId
                    : interaction.guild.id,
                severity: severity
            })

            interaction.reply({
                content: `<@${userId}> blacklisted from ${global ? "everywhere" : "this server"} at severity level ${severity}.`,
                allowedMentions: {parse: []}
            });
        } else {
            if (global && admins.includes(interaction.user.id)) {
                blacklistItem.destroy({where: {guildId: globalAndTestGuildId}}).then(
                    interaction.reply({
                        content: `<@${userId}> removed from the global blacklist`,
                        allowedMentions: {parse: []}
                    })
                )
            } else {
                blacklistItem.destroy({where: {guildId: interaction.guild.id}}).then(
                    interaction.reply({
                        content: `<@${userId}> removed from the server blacklist`,
                        allowedMentions: {parse: []}
                    })
                )
            }
        }
        
    }
}
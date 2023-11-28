const { SlashCommandBuilder } = require('@discordjs/builders');
const { quote, savedGuild} = require('../models')

module.exports = {
    guildCommand: true,
	data: new SlashCommandBuilder()
    .setName('findquotes')
		.setDescription('Ah, good memories. What funny moments have been stored here?')
        
        .addStringOption(option =>
            option.setName("source")
            .setDescription("Filter by the user who said the thing.")
        )
        .addUserOption(option =>
            option.setName("archiver")
            .setDescription("Hey! Who recorded me saying that?!")
        ),
    async execute(interaction) {
        const client = interaction.client;
        
        let archiverUserId = interaction.options.getUser('archiver')?.id;//if this exists, get the savedUser for the archiver

        let source = interaction.options.getString('source');//where source = this
        let sourceUserId = source?.match(/\d+/)?.[0];
        if (sourceUserId) {
            //perhaps a try catch. what if the user is deleted?
            try {
                source = (await interaction.guild.members.fetch(sourceUserId)?.displayName) 
                || (await client.users.fetch(sourceUserId)?.username);
            } catch {
                source = interaction.options.getString('source');
            }
        }

        const options = {
            where: {
                guildId: interaction.guildId
            },
            include: {
                model: quote,
                where: {}
            },
        }
        if (archiverUserId) {
            options.include.where.archiverUserId = archiverUserId;
        }
        if (sourceUserId) {
            options.include.where.sourceUserId = sourceUserId;
        } else if (source) {
            options.include.where.sourceAlias = source;
        }
        const entry = await savedGuild.findOne(options)

        if (!entry?.quotes) {
            interaction.reply("No quotes found!");
            return;
        }

        let formattedQuotesArray = [];
        for (const quote of entry.quotes) {
            formattedQuotesArray.push(
                `"${quote.content}" -${quote.sourceAlias} ${quote.sourceMessageId ?
                `\r Source: https://discord.com/channels/${entry.guildId}/${quote.sourceChannelId}/${quote.sourceMessageId}`
                : ""}`
            )
        }
        //TODO:
        //slice up messages, or make it a rich embed with pages. Something!
        interaction.reply(
            formattedQuotesArray.join("\n").substring(0, 2000)
        )
    }
}
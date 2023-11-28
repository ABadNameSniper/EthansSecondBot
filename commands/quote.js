const { SlashCommandBuilder } = require('@discordjs/builders');

const { quote } = require('../models');
const savedUser = require('../models/savedUser.model');


module.exports = {
    guildCommand: true,
	data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Stores a quote into the database.')
    .addStringOption(option =>
        option.setName('content')
        .setDescription('What did they say? Accepts a message link to the quote.')
        .setRequired(true)
    )
    .addStringOption(option => 
        option.setName('source')
        .setDescription("Who said it? Leave blank for anonymous or autofill from link")
    )
    ,
    async execute(interaction) {
        const archiverUserId = interaction.user.id;
        const archiverGuildId = interaction.guildId;
        
        let content = interaction.options.getString('content');
        let source = interaction.options.getString('source') || "Anonymous";
        
        const [sourceGuildId, sourceChannelId, sourceMessageId] = 
            content.match(/https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+/)?.[0].match(/\d+/g)
            || [];
        let sourceUserId, sourceAlias;
        if (sourceGuildId === interaction.guildId && sourceChannelId && sourceMessageId) {
            const channel = await interaction.guild.channels.fetch(sourceChannelId);
            const message = await channel.messages.fetch(sourceMessageId);

            source = message.author
            sourceAlias = message.member.displayName;

            sourceUserId = source.id;
            content = message.content;

            await savedUser.findOrCreate({where: {userId: sourceUserId}});
        } else {
            //match <@userid>
            sourceUserId = source?.match(/\d+/)?.[0];
            if (sourceUserId) {
                source = await interaction.guild.members.fetch(sourceUserId);
                sourceAlias = source.displayName;
                //Make sure the source user is in the database to avoid Foreign Key constraint failure.
                await savedUser.findOrCreate({where: {userId: sourceUserId}});
            }
        }

        if (sourceUserId === archiverUserId) {
            interaction.reply("Self-quote? Kinda cringe :flushed:"); 
            return;
        } 
        if (source?.bot) {
            interaction.reply({content: "You can't quote a bot!", ephemeral: true});
            return;
        } 
        //If not previously set, use whatever the user provided.
        if (!sourceAlias) sourceAlias = source

        try {
            await quote.create({
                archiverUserId,
                archiverGuildId,
                content,
                sourceAlias,
                sourceGuildId,
                sourceChannelId,
                sourceMessageId,
                sourceUserId,
            });
            interaction.reply({content: 'Quote created successfully!', ephemeral: true});
        } catch (error) {
            interaction({content: 'Error creating quote!', ephemeral: true});
            console.log("Error creating quote:", error);
        }
    }
}
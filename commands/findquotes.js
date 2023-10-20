const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, MessageSelectMenu } = require('discord.js');

const indexRoot = process.cwd()
const { database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
//const { Page, Menu } = require('../utils/menuSystem');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js');
const quote = databaseModels.quote(sequelize, Sequelize.DataTypes);
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes);
const serverInfo = databaseModels.serverInfo(sequelize, Sequelize.DataTypes);

userInfo.hasMany(quote, {foreignKey: "archiverId"});
userInfo.hasMany(quote, {foreignKey: "sourceUserId"});
serverInfo.hasMany(quote);

userInfo.sync();
serverInfo.sync();
quote.sync();

module.exports = {
    guildCommand: true,//true,//temporary
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
        
        let archiverId = interaction.options.getUser('archiver')?.id;//if this exists, get the userInfo for the archiver

        let source = interaction.options.getString('source');//where source = this
        let sourceId = source?.match(/\d+/)?.[0];
        if (sourceId) {
            //perhaps a try catch. what if the user is deleted?
            try {
                source = (await interaction.guild.members.fetch(sourceId)?.displayName) 
                || (await client.users.fetch(sourceId)?.username);
            } catch {
                source = interaction.options.getString('source');
            }
        }

        const options = {
            where: {
                serverId: interaction.guildId
            },
            include: {
                model: quote,
                where: {},
            },
        }
        if (archiverId) options.include.where.archiverId = archiverId;
        if (sourceId) options.include.where.sourceId = sourceId;
        const entry = await serverInfo.findOne(options)

        if (!entry?.quotes) {
            interaction.reply("No quotes found!");
            return;
        }

        let formattedQuotesArray = [];
        for (const quote of entry.quotes) {
            formattedQuotesArray.push(
                `"${quote.content}" -${quote.shownSource} ${quote.messageId ?
                `\r Source: https://discord.com/channels/${entry.serverId}/${quote.channelId}/${quote.messageId}`
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
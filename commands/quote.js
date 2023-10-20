const { SlashCommandBuilder } = require('@discordjs/builders');

const indexRoot = process.cwd();
const { database, user, password, options } = require(indexRoot+'/config.json');
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
        const archiverId = interaction.user.id;
        const sourceServerId = interaction.guildId;

        let content = interaction.options.getString('content');
        let source = interaction.options.getString('source') || "Anonymous";
        
        const [serverId, channelId, messageId] = content.match(/https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+/)?.[0].match(/\d+/g);
        let sourceId, sourceName;
        if (serverId === sourceServerId && channelId && messageId) {
            const channel = await interaction.guild.channels.fetch(channelId);
            const message = await channel.messages.fetch(messageId);

            source = message.author
            sourceName = message.member.displayName;

            sourceId = source.id;
            content = message.content;
        } else {
            sourceId = source?.match(/\d+/)?.[0];
            if (sourceId) {
                source = await interaction.guild.members.fetch(sourceId);
                sourceName = source.displayName;
            }
        }


        if (sourceId === archiverId) {
            interaction.reply("Self-quote? Kinda cringe :flushed:"); 
            return;
        } 
        if (source?.bot) {
            interaction.reply({content:"You can't quote a bot!", ephemeral:true});
            return;
        } 
        //If not previously set, use whatever the user provided.
        if (!sourceName) sourceName = source

        databaseModels.userInfoDefault(userInfo, archiverId).then(()=>{
            quote.create({
                channelId: channelId,
                messageId: messageId,
                serverInfoServerId: sourceServerId,
                content: content,
                shownSource: sourceName,
                sourceUserId: sourceId,
                archiverId: archiverId
            }).then(
                interaction.reply({content:"Quote Saved!", ephemeral: true})
            );
        });
    }
}
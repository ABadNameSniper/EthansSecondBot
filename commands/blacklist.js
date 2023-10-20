const { SlashCommandBuilder } = require('@discordjs/builders');
const indexRoot = process.cwd()
const { globalAndTestGuildId, permissionHierarchy, database, user, password, options } = require(indexRoot+'/config.json');
const admins = permissionHierarchy.admins;
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js')
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes);
const serverInfo = databaseModels.serverInfo(sequelize, Sequelize.DataTypes);
const blacklistItem = databaseModels.blacklistItem(sequelize, Sequelize.DataTypes);


userInfo.hasMany(blacklistItem, {sourceKey: 'userId'/*, foreignKey: 'id'*/});
serverInfo.hasMany(blacklistItem, {sourceKey: 'serverId'});


//before or after defining associations??
userInfo.sync();
blacklistItem.sync({force: false})//.then(console.log("bli sync"));



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
        const userId = interaction.options.getUser('user').id;
        const severity = Math.max(Math.min(interaction.options.getInteger('severity'), 4), 1)   || 1;
        const remove = interaction.options.getBoolean('remove')                                 || false;
        const global = interaction.options.getBoolean('global')                                 || false;
        let currentUserInfo = await databaseModels.userInfoDefault(userInfo, userId);
        if (!remove) {
            await blacklistItem.create({
                userInfoUserId: userId,
                serverInfoServerId: (global && admins.includes(interaction.user.id) )
                    ? globalAndTestGuildId
                    : interaction.guild.id,
                severity: severity
            }).then(console.log);

            interaction.reply(`<@${userId}> blacklisted from ${global ? "everywhere" : "this server"} at severity level ${severity}.`);
        } else {
            if (global && admins.includes(interaction.user.id)) {
                blacklistItem.destroy({where: {serverInfoServerId: globalAndTestGuildId}}).then(
                    interaction.reply(`<@${userId}> removed from the global blacklist`)
                ).catch(console.log);
            } else {
                blacklistItem.destroy({where: {serverInfoServerId: interaction.guild.id}}).then(
                    interaction.reply(`<@${userId}> removed from the server blacklist`)
                ).catch(console.log);
            }
        }
        
    }
}
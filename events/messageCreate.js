const fs = require('fs');
const indexRoot = process.cwd()
const triggerwordspath = indexRoot+'/triggerwords'
const { globalAndTestGuildId, clientId, database, user, password, options } = require(indexRoot+'/config.json');
const {Sequelize, Op} = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js')
const serverInfo = databaseModels.serverInfo(sequelize, Sequelize.DataTypes);
const userInfo = databaseModels.userInfo(sequelize, Sequelize.DataTypes);
const { PermissionFlagsBits } = require('discord.js')

const blacklistItem = databaseModels.blacklistItem(sequelize, Sequelize.DataTypes);
userInfo.hasMany(blacklistItem, {sourceKey: 'userId'});
blacklistItem.belongsTo(userInfo, {targetKey: 'userId'});
serverInfo.hasMany(blacklistItem, {sourceKey: 'serverId'});
blacklistItem.belongsTo(serverInfo, {targetKey: 'serverId'});

serverInfo.sync();

var triggerwords = [];
var permissions = [];
//kinda tacked onto triggerwords array generation system. 
//Don't feel like I want to do a rework, or even if one is necessary
//maybe it's a gross array and i should have file = {triggerRegex: blah, permissions: blah}
for (const file of fs.readdirSync(triggerwordspath)) {
   	triggerwords.push([require(`${triggerwordspath}/${file}`).regex, file]);
    permissions.push([require(`${triggerwordspath}/${file}`).permissionRequired, file])
}

module.exports = {
	name: 'messageCreate',
	async execute(msg) {
        // if it's any bot or in DMs then do nothing (robophobia)
        if (msg.author.bot || !msg.inGuild()) return; 

        const severity = (await blacklistItem.findAll({
            where: {
                [Op.or]: [// Filtering out irrelevant servers
                    {serverInfoServerId: msg.guild.id}, 
                    {serverInfoServerId: globalAndTestGuildId}
                ],
            },
            order: [
                ["severity", "DESC"]
            ],
        }))?.[0]?.severity;

        if (severity >= 3) return;

        for (const pair in triggerwords) {
            if (
                msg.content.match(triggerwords[pair][0]) 
                && msg.channel.permissionsFor(clientId).has(PermissionFlagsBits[permissions[pair][0]])
            ) {
                const currentServerInfo = await databaseModels.serverInfoDefault(serverInfo, msg.guild.id);
                if (currentServerInfo.serverSettings[triggerwords[pair][1]] === true) {
                    require(`${triggerwordspath}/${triggerwords[pair][1]}`).execute(msg, clientId, severity);
                }
            }
        }
    }
};
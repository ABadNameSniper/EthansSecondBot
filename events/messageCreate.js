const fs = require('fs');
const path = require('path');
const triggerWordsPath = path.resolve(__dirname, '../triggerwords');
const { globalAndTestGuildId, clientId, } = require('../config.json');
const { Op } = require('sequelize');
const { savedGuild, blacklistItem } = require('../models');
const { PermissionFlagsBits } = require('discord.js')

var triggerwords = [];
var permissions = [];
//kinda tacked onto triggerwords array generation system. 
//Don't feel like I want to do a rework, or even if one is necessary
//maybe it's a gross array and i should have file = {triggerRegex: blah, permissions: blah}
for (const file of fs.readdirSync(triggerWordsPath)) {
   	triggerwords.push([require(path.join(triggerWordsPath, file)).regex, file]);
    permissions.push([require(path.join(triggerWordsPath, file)).permissionRequired, file])
}

module.exports = {
	name: 'messageCreate',
	async execute(msg) {
        // if it's a bot or in DMs then do nothing
        if (msg.author.bot || !msg.inGuild()) return; 

        //Get the most important blacklistItem's severity
        const severity = (await blacklistItem.findAll({
            where: {
                [Op.or]: [
                    {guildId: msg.guild.id}, 
                    {guildId: globalAndTestGuildId}
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
                const [currentGuild] = await savedGuild.findOrCreate({where: {guildId: msg.guild.id}});
                console.log(currentGuild);
                if (currentGuild.serverSettings[triggerwords[pair][1]]) {
                    require(path.join(triggerWordsPath, triggerwords[pair][1])).execute(msg, clientId, severity);
                }
            }
        }
    }
};
const { PermissionFlagsBits } = require('discord.js');
const updateCommands = require(`../utils/updateCommands.js`);
const headAdminId = require('../config.json').admins[0];
const primeCategory = require('../config.json').broadcastCategories[0];
module.exports = {
	name: 'guildCreate',
	async execute(guildId, client) {
        const guild = await client.guilds.fetch(guildId);
        console.log("Hey, the bot was added to a new server!", guild);
        await updateCommands.updateGuildCommands(client, guild.id);
        updateCommands.updateGuildCommandPermissions(client, guild.id);
        const welcomeString = 
            "Thanks for adding Ethan's Second Bot to your server! "
            + "ESB is geared to make your server more fun whether with its hyperchat system, "
            + "allowing users to speak to those in entirely different servers, "
            + "or its pretty darn good minesweeper complete with leaderboards!";
        if (
            guild.systemChannelId 
            && guild.systemChannel.permissionsFor(client.user.id)?.has(PermissionFlagsBits.SendMessages)
        ) {
            require('../commands/broadcasts.js').addNewChannel(headAdminId, primeCategory, guild.systemChannelId);
            //TODO: add server setting that disables this...
            guild.systemChannel.send(
                welcomeString +
                "\rUpdates come frequently, so I've added a broadcast listener to this channel that will let you know of new content!"
            );
        } else {
            guild.fetchOwner().then(owner => {
                owner.send(
                    "Either there was no system channel, or I don't have permission to speak in it. "
                    + welcomeString
                );
            })
        }
        
    }
}
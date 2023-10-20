//const fs = require('fs');
const { PermissionFlagsBits } = require('discord.js');
const indexRoot = process.cwd();
//const updateCommandsExports = require(`${indexRoot}/updateCommandsExports.js`);
const { database, user, password, options } = require(indexRoot+'/config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, user, password, options);
const databaseModels = require(indexRoot+'/utils/databaseModels.js');
const listeningChannel = databaseModels.listeningChannel(sequelize, Sequelize.DataTypes)
listeningChannel.sync();

const updateCommands = require(`${indexRoot}/utils/updateCommands.js`);
module.exports = {
	name: 'guildCreate',
	async execute(guildId, client) {
        const guild = await client.guilds.fetch(guildId);
        console.log(guild);
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
            require(indexRoot+'/commands/broadcasts.js').addNewChannel(listeningChannel, guild.systemChannelId, "Updates");
            guild.systemChannel.send(welcomeString+
                "\rUpdates come very frequently, so I've added a broadcast listener to this channel that will let you know of new content!"
            );
        } else {
            guild.fetchOwner().then(owner => {
                owner.send(
                    "Either there was no system channel, or I don't have permission to speak in it. "
                    + welcomeString
                    + " You can see update logs as they come by using /broadcast add in your server."
                );
            })
        }
        
    }
}
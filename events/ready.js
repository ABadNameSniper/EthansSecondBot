const fs = require('fs');
const { ActivityType } = require("discord.js");
const indexRoot = process.cwd();
const updateCommands = require(`${indexRoot}/utils/updateCommands.js`);
const commandsFolderPath = indexRoot+'/commands';
const globalCommands = [];
const guildCommands = [];

for (const file of fs.readdirSync(commandsFolderPath)) {
	const command = require(`${commandsFolderPath}/${file}`); 
    if (command.guildCommand) {
        guildCommands.push(command.data.toJSON());
    } else {
        //if this breaks, its probably because of the database or circular dependency
	    globalCommands.push(command.data.toJSON());
    }
}

const startingStatusArray = [`the "birds" (drones)`, `Selam, everyone!`, `thanks Dragonhelm for the PFP!`];
const startingStatusArrayType = [ActivityType.Watching, ActivityType.Playing, ActivityType.Listening];

module.exports = {
	name: 'ready',
	once: true,
	async execute(client) {

        //TODO: remove these comments I guess. I don't think updating commands should require a restart of the bot.

        //Update everything?
        // if (true) {
        //     await updateCommands.updateGuildCommands(client);
        //     console.log("epic");
        //     // await updateCommands.updateGuildCommandPermissions(client);
        //     // console.log('epic 2');
        // }

        // if (true) {
        //     await updateCommands.updateGuildCommands(client, guildId);
        //     console.log("epic");
        //     await updateCommands.updateGuildCommandPermissions(client, guildId);
        //     console.log('epic 2');
        // }

        // if (true) {
        //     await updateCommands.updateGuildCommands(client);
        //     console.log("epic");
        //     // await updateCommands.updateGuildCommandPermissions(client, undefined, "");
        //     // console.log('epic 2');
        // }
        // updateCommands.updateApplicationCommands(client);


        const rdmNumber = [Math.floor(Math.random() * startingStatusArray.length)];
        client.user.setActivity(startingStatusArray[rdmNumber], {type: startingStatusArrayType[rdmNumber]});

        console.log(`Ready! Logged in as ${client.user.tag}\n${startingStatusArray[rdmNumber]}`);
	},
};
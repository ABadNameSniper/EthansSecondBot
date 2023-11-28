const fs = require('fs');
const path = require('path');
const { ActivityType } = require("discord.js");
const commandsFolderPath = path.resolve(__dirname, '../commands');
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
        const rdmNumber = [Math.floor(Math.random() * startingStatusArray.length)];
        client.user.setActivity(startingStatusArray[rdmNumber], {type: startingStatusArrayType[rdmNumber]});

        console.log(`Ready! Logged in as ${client.user.tag}\n${startingStatusArray[rdmNumber]}`);
	},
};
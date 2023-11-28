// Require the necessary discord.js classes
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const { token } = require('./config.json');
const syncDB = require("./utils/syncDB.js");

// Create a new client instance
const client = new Client(
	{ 
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildVoiceStates,
			GatewayIntentBits.GuildPresences,

			GatewayIntentBits.MessageContent,

			GatewayIntentBits.DirectMessages,
		], 
		partials: [Partials.Channel, Partials.Message, Partials.Reaction]
	}
);

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    //set a new item in the collection
    // with the key as the command name and the value as the exported module
    if (!command.data) console.error(`malformed command: ${file}`);
    client.commands.set(command.data.name, command); //as seen in interactionCreate.js
}

const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}
syncDB.updateAllDB().then(() => {
	client.login(token);
})
// Login to Discord with your client's token

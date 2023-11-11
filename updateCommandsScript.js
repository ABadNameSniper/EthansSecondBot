const { token } = require('./config.json');
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
    ], 
    partials: []
});
client.login(token);

const updateCommands = require("./utils/updateCommands");

module.exports = {
    updateGuildCommands: function() {
        client.once("ready", async client => { 
            await updateCommands.updateGuildCommands(client);
        })
    },
    updateAppCommands: function() {
        client.once("ready", async client => {
            await updateCommands.updateApplicationCommands()
        })
    },
}
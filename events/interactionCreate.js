const { InteractionType } = require("discord-api-types/v10");

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
        const client = interaction.client

        if (interaction.type !== InteractionType.ApplicationCommand) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.log("Something went wrong trying to execute a command!");
                console.log(error);
                try {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                } catch (error) {
                    console.log(
                        "The failure message failed to send!",
                        "Something has gone catostrophically wrong, or the interaction was already replied to."
                        )
                    console.log(error)
                }
            }
        
	},
};